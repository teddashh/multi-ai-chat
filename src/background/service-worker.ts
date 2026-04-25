import type {
  AIProvider,
  AIConnection,
  ExtensionMessage,
  ChatMode,
  DebateRoles,
  ConsultRoles,
  CodingRoles,
  RoundtableRoles,
} from '../shared/types';
import {
  AI_PROVIDERS,
  PROMPTS,
  DEFAULT_DEBATE_ROLES,
  DEFAULT_CONSULT_ROLES,
  DEFAULT_CODING_ROLES,
  DEFAULT_ROUNDTABLE_ROLES,
} from '../shared/constants';

// === State ===

let workflowAborted = false;

const connections: Record<AIProvider, AIConnection> = {
  chatgpt: { provider: 'chatgpt', status: 'disconnected' },
  claude: { provider: 'claude', status: 'disconnected' },
  gemini: { provider: 'gemini', status: 'disconnected' },
  grok: { provider: 'grok', status: 'disconnected' },
};

// === Side Panel Setup ===

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// === Tab Tracking ===

function getProviderFromUrl(url: string): AIProvider | null {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('grok.com')) return 'grok';
  return null;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const provider = getProviderFromUrl(tab.url);
    if (provider) {
      connections[provider] = { provider, status: 'connected', tabId };
      broadcastConnections();
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const provider of Object.keys(connections) as AIProvider[]) {
    if (connections[provider].tabId === tabId) {
      connections[provider] = { provider, status: 'disconnected' };
      broadcastConnections();
    }
  }
});

function broadcastConnections() {
  chrome.runtime.sendMessage({
    action: 'CONNECTIONS_UPDATE',
    payload: connections,
  }).catch(() => {});
}

// === Message Handling ===

// Track listeners for serial mode waitForResponse
const responseListeners: Set<(message: ExtensionMessage) => void> = new Set();

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.action) {
    case 'GET_CONNECTIONS':
      sendResponse(connections);
      return true;

    case 'STATUS_REPORT':
      if (message.provider && sender.tab?.id) {
        connections[message.provider] = {
          provider: message.provider,
          status: 'connected',
          tabId: sender.tab.id,
        };
        broadcastConnections();
      }
      return false;

    case 'OPEN_LOGIN':
      if (message.provider) {
        const info = AI_PROVIDERS[message.provider];
        chrome.tabs.create({ url: info.loginUrl });
      }
      return false;

    case 'CANCEL_WORKFLOW':
      workflowAborted = true;
      sendWorkflowStatus('');
      return false;

    case 'PUBLISH_HACKMD':
      handleHackMDPublish(message.payload as { token: string; title: string; content: string })
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ ok: false, error: (err as Error).message }));
      return true; // keep message channel open for async response

    case 'SEND_MESSAGE':
      handleSendMessage(message.payload as {
        text: string;
        mode: ChatMode;
        roles?: DebateRoles | ConsultRoles | CodingRoles;
        targets?: AIProvider[];
      });
      return false;

    case 'RESPONSE_CHUNK':
    case 'RESPONSE_DONE':
      // Only process messages from content scripts (they have sender.tab)
      if (!sender.tab) return false;

      // Notify serial-mode waitForResponse listeners
      for (const listener of responseListeners) {
        listener(message);
      }

      // Side panel already receives these messages directly via chrome.runtime.onMessage
      // (content scripts' chrome.runtime.sendMessage reaches all extension pages)
      // No need to re-broadcast — doing so causes duplicate messages in Side Panel
      return false;
  }
  return false;
});

// === Send Message Logic ===

async function sendToProvider(provider: AIProvider, text: string): Promise<void> {
  const conn = connections[provider];
  if (conn.status !== 'connected' || !conn.tabId) {
    throw new Error(`${AI_PROVIDERS[provider].name} is not connected`);
  }
  await chrome.tabs.sendMessage(conn.tabId, {
    action: 'SEND_MESSAGE',
    provider,
    payload: { text },
  });
}

function waitForResponse(provider: AIProvider, timeoutMs = 600000): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const listener = (message: ExtensionMessage) => {
      if (message.action === 'RESPONSE_DONE' && message.provider === provider) {
        if (settled) return;
        settled = true;
        responseListeners.delete(listener);
        resolve(message.payload as string);
      }
    };

    // Use our own listener set (not chrome.runtime.onMessage) to avoid re-broadcast loop
    responseListeners.add(listener);

    // Timeout: don't hang forever (default 10 minutes — ChatGPT web search can be very slow)
    setTimeout(() => {
      if (settled) return;
      settled = true;
      responseListeners.delete(listener);
      reject(new Error(`${AI_PROVIDERS[provider].name} response timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  });
}

async function sendAndWait(provider: AIProvider, text: string): Promise<string> {
  const responsePromise = waitForResponse(provider);
  await sendToProvider(provider, text);
  return responsePromise;
}

function checkAborted(): void {
  if (workflowAborted) {
    throw new Error('Workflow cancelled by user');
  }
}

async function handleSendMessage(params: {
  text: string;
  mode: ChatMode;
  roles?: DebateRoles | ConsultRoles | CodingRoles | RoundtableRoles;
  targets?: AIProvider[];
}) {
  const { text, mode, roles } = params;
  workflowAborted = false;

  try {
    switch (mode) {
      case 'free':
        await handleFreeMode(text);
        break;
      case 'debate':
        await handleDebateMode(text, (roles as DebateRoles) ?? DEFAULT_DEBATE_ROLES);
        break;
      case 'consult':
        await handleConsultMode(text, (roles as ConsultRoles) ?? DEFAULT_CONSULT_ROLES);
        break;
      case 'coding':
        await handleCodingMode(text, (roles as CodingRoles) ?? DEFAULT_CODING_ROLES);
        break;
      case 'roundtable':
        await handleRoundtableMode(text, (roles as RoundtableRoles) ?? DEFAULT_ROUNDTABLE_ROLES);
        break;
    }
  } catch (err) {
    chrome.runtime.sendMessage({
      action: 'RESPONSE_DONE',
      provider: 'system' as AIProvider,
      payload: `Error: ${(err as Error).message}`,
    }).catch(() => {});
    sendWorkflowStatus('');
  }
}

// === Workflow Status ===

function sendWorkflowStatus(text: string) {
  chrome.runtime.sendMessage({
    action: 'WORKFLOW_STATUS',
    payload: text,
  }).catch(() => {});
}

// === Role Assignment ===

function sendRoleAssignment(provider: AIProvider, role: string, label: string) {
  chrome.runtime.sendMessage({
    action: 'ROLE_ASSIGNMENT',
    provider,
    payload: { role, label },
  }).catch(() => {});
}

// --- Free Mode: parallel ---
async function handleFreeMode(text: string) {
  const connected = (Object.keys(connections) as AIProvider[])
    .filter((p) => connections[p].status === 'connected');

  const names = connected.map((p) => AI_PROVIDERS[p].name).join('、');
  sendWorkflowStatus(`⚡ ${names} 同時作答中...`);
  await Promise.all(connected.map((provider) =>
    sendAndWait(provider, text).catch(() => {})
  ));
  sendWorkflowStatus('');
}

// --- Debate Mode: pro → con → judge → summary ---
async function handleDebateMode(text: string, roles: DebateRoles) {
  const proName = AI_PROVIDERS[roles.pro].name;
  const conName = AI_PROVIDERS[roles.con].name;
  const judgeName = AI_PROVIDERS[roles.judge].name;
  const sumName = AI_PROVIDERS[roles.summary].name;

  checkAborted();
  sendWorkflowStatus(`⚔️ 正方 ${proName} 論述中...`);
  sendRoleAssignment(roles.pro, 'pro', '正方');
  const proPrompt = PROMPTS.debate.pro(text);
  const proResponse = await sendAndWait(roles.pro, proPrompt);

  checkAborted();
  sendWorkflowStatus(`⚔️ 反方 ${conName} 反駁中...`);
  sendRoleAssignment(roles.con, 'con', '反方');
  const conPrompt = PROMPTS.debate.con(text, proResponse);
  const conResponse = await sendAndWait(roles.con, conPrompt);

  checkAborted();
  sendWorkflowStatus(`⚔️ 判官 ${judgeName} 評析中...`);
  sendRoleAssignment(roles.judge, 'judge', '判官');
  const judgePrompt = PROMPTS.debate.judge(text, proResponse, conResponse);
  const judgeResponse = await sendAndWait(roles.judge, judgePrompt);

  checkAborted();
  sendWorkflowStatus(`⚔️ ${sumName} 歸納總結中...`);
  sendRoleAssignment(roles.summary, 'summary', '總結');
  const summaryPrompt = PROMPTS.debate.summary(text, proResponse, conResponse, judgeResponse);
  await sendAndWait(roles.summary, summaryPrompt);
  sendWorkflowStatus('');
}

// --- Consult Mode: first + second (parallel) → reviewer → summary ---
async function handleConsultMode(text: string, roles: ConsultRoles) {
  const firstName = AI_PROVIDERS[roles.first].name;
  const secondName = AI_PROVIDERS[roles.second].name;
  const reviewerName = AI_PROVIDERS[roles.reviewer].name;
  const sumName = AI_PROVIDERS[roles.summary].name;

  checkAborted();
  sendWorkflowStatus(`🔍 ${firstName} 與 ${secondName} 同時回答中...`);
  sendRoleAssignment(roles.first, 'first', '先答 A');
  sendRoleAssignment(roles.second, 'second', '先答 B');
  const [firstResponse, secondResponse] = await Promise.all([
    sendAndWait(roles.first, PROMPTS.consult.first(text)),
    sendAndWait(roles.second, PROMPTS.consult.second(text)),
  ]);

  checkAborted();
  sendWorkflowStatus(`🔍 ${reviewerName} 審查中...`);
  sendRoleAssignment(roles.reviewer, 'reviewer', '審查');
  const reviewerPrompt = PROMPTS.consult.reviewer(text, firstResponse, firstName, secondResponse, secondName);
  const reviewerResponse = await sendAndWait(roles.reviewer, reviewerPrompt);

  checkAborted();
  sendWorkflowStatus(`🔍 ${sumName} 總結中...`);
  sendRoleAssignment(roles.summary, 'summary', '總結');
  const summaryPrompt = PROMPTS.consult.summary(
    text,
    firstResponse,
    firstName,
    secondResponse,
    secondName,
    reviewerResponse,
    reviewerName,
  );
  await sendAndWait(roles.summary, summaryPrompt);
  sendWorkflowStatus('');
}

// --- Coding Mode: 8-step double-loop forge with Tester ---
async function handleCodingMode(text: string, roles: CodingRoles) {
  const plannerName = AI_PROVIDERS[roles.planner].name;
  const reviewerName = AI_PROVIDERS[roles.reviewer].name;
  const coderName = AI_PROVIDERS[roles.coder].name;
  const testerName = AI_PROVIDERS[roles.tester].name;

  // === Design Loop ===
  checkAborted();
  sendWorkflowStatus(`💻 Step 1/8 — ${plannerName} 撰寫規格中...`);
  sendRoleAssignment(roles.planner, 'planner', '規劃師');
  const spec = await sendAndWait(roles.planner, PROMPTS.coding.plannerSpec(text));

  checkAborted();
  sendWorkflowStatus(`💻 Step 2/8 — ${reviewerName} 審查規格中...`);
  sendRoleAssignment(roles.reviewer, 'reviewer', '審查者');
  const specReview = await sendAndWait(roles.reviewer, PROMPTS.coding.reviewerSpec(text, spec, plannerName));

  // === Implementation Loop ===
  checkAborted();
  sendWorkflowStatus(`💻 Step 3/8 — ${coderName} 撰寫 v1 中...`);
  sendRoleAssignment(roles.coder, 'coder', 'Coder');
  const codeV1 = await sendAndWait(roles.coder, PROMPTS.coding.coderV1(text, spec, plannerName, specReview, reviewerName));

  checkAborted();
  sendWorkflowStatus(`💻 Step 4/8 — ${reviewerName} Code Review 中...`);
  sendRoleAssignment(roles.reviewer, 'reviewer', 'Code Review');
  const codeReview = await sendAndWait(roles.reviewer, PROMPTS.coding.reviewerCode(text, codeV1, coderName));

  checkAborted();
  sendWorkflowStatus(`💻 Step 5/8 — ${testerName} 測試分析中...`);
  sendRoleAssignment(roles.tester, 'tester', 'Tester');
  const testReport = await sendAndWait(roles.tester, PROMPTS.coding.testerCases(text, codeV1, coderName));

  checkAborted();
  sendWorkflowStatus(`💻 Step 6/8 — ${coderName} 修正 → v2 中...`);
  sendRoleAssignment(roles.coder, 'coder', 'v2 修正');
  const codeV2 = await sendAndWait(
    roles.coder,
    PROMPTS.coding.coderV2(text, codeV1, codeReview, reviewerName, testReport, testerName),
  );

  // === Acceptance Loop ===
  checkAborted();
  sendWorkflowStatus(`💻 Step 7/8 — ${plannerName} 驗收中...`);
  sendRoleAssignment(roles.planner, 'planner', '驗收');
  const acceptance = await sendAndWait(roles.planner, PROMPTS.coding.plannerAcceptance(text, codeV2, coderName, spec));

  checkAborted();
  sendWorkflowStatus(`💻 Step 8/8 — ${coderName} 最終修正中...`);
  sendRoleAssignment(roles.coder, 'coder', '最終版');
  await sendAndWait(roles.coder, PROMPTS.coding.coderFinal(text, codeV2, acceptance, plannerName));

  sendWorkflowStatus('');
}

// --- Roundtable Mode: 5 rounds × 4 participants (Dialectical Spiral) ---
const ROUND_LABELS = ['開場立論', '交叉質疑', '攻防深化', '核心收斂', '真理浮現'];

async function handleRoundtableMode(text: string, roles: RoundtableRoles) {
  const participants: AIProvider[] = [roles.first, roles.second, roles.third, roles.fourth];
  const history: { name: string; round: number; text: string }[] = [];

  for (let round = 1; round <= 5; round++) {
    for (const participant of participants) {
      checkAborted();

      const name = AI_PROVIDERS[participant].name;
      const roundLabel = ROUND_LABELS[round - 1];
      sendWorkflowStatus(`🔄 第${round}輪「${roundLabel}」— ${name} 發言中...`);
      sendRoleAssignment(participant, `R${round}`, `第${round}輪`);

      const prompt = PROMPTS.roundtable.buildPrompt(text, round, name, history);
      const response = await sendAndWait(participant, prompt);

      history.push({ name, round, text: response });
    }
  }

  sendWorkflowStatus('');
}

// --- HackMD Publish (runs in service worker so host_permissions bypasses CORS) ---
async function handleHackMDPublish(payload: { token: string; title: string; content: string }) {
  const response = await fetch('https://api.hackmd.io/v1/notes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${payload.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      content: payload.content,
      readPermission: 'guest',
      writePermission: 'owner',
      commentPermission: 'disabled',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HackMD ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as { id?: string; publishLink?: string };
  const editLink = data.id ? `https://hackmd.io/${data.id}` : '';
  const publishLink = data.publishLink || (data.id ? `https://hackmd.io/@/${data.id}/publish` : '');
  if (!publishLink) throw new Error('HackMD response missing publish link');
  return { publishLink, editLink };
}

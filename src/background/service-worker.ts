import type {
  AIProvider,
  AIConnection,
  ChatMode,
  DebateRoles,
  ConsultRoles,
  CodingRoles,
  RoundtableRoles,
  ExtensionMessage,
  WorkflowStatusPayload,
} from '../shared/types';
import {
  AI_PROVIDERS,
  PROMPTS,
  DEFAULT_DEBATE_ROLES,
  DEFAULT_CONSULT_ROLES,
  DEFAULT_CODING_ROLES,
  DEFAULT_ROUNDTABLE_ROLES,
} from '../shared/constants';
import { questionWithConversationContext } from '../shared/conversationContinuity';
import { encodeError } from '../shared/errors';

interface ResponseWaiter {
  provider: AIProvider;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface SendParams {
  text: string;
  context?: string;
  mode: ChatMode;
  roles?: DebateRoles | ConsultRoles | CodingRoles | RoundtableRoles;
  targets?: AIProvider[];
  sessionId: string;
  clientId: string;
}

const PROVIDERS: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok'];
const ACTIVE_WORKFLOW_STORAGE_KEY = 'multiAiActiveWorkflow';
const CONTENT_SCRIPT_FILES: Record<AIProvider, string> = {
  chatgpt: 'content/chatgpt.js',
  claude: 'content/claude.js',
  gemini: 'content/gemini.js',
  grok: 'content/grok.js',
};

const connections: Record<AIProvider, AIConnection> = Object.fromEntries(
  PROVIDERS.map((provider) => [provider, { provider, status: 'disconnected' }]),
) as Record<AIProvider, AIConnection>;

const responseWaiters = new Map<string, ResponseWaiter>();
// notes: 只有這輪流程真的送過訊息的 provider 才需要記網址；其餘分頁與這個對話無關
const workflowProviders = new Set<AIProvider>();
let workflowAborted = false;
let activeWorkflowId: string | undefined;
let activeSessionId: string | undefined;
let activeClientId: string | undefined;

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
void refreshConnections();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'multi-ai-sidepanel') return;
  port.onMessage.addListener(() => {});
});

chrome.runtime.onInstalled.addListener(() => void refreshConnections());
chrome.runtime.onStartup.addListener(() => void refreshConnections());

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab.url) return;
  const provider = getProviderFromUrl(tab.url);
  if (!provider) {
    let changed = false;
    for (const candidate of PROVIDERS) {
      if (connections[candidate].tabId !== tabId) continue;
      rejectWaitersForProvider(candidate, new Error(encodeError('error.navigated_away', { provider: candidate })));
      connections[candidate] = { provider: candidate, status: 'disconnected' };
      changed = true;
    }
    if (changed) broadcastConnections();
    return;
  }
  // onUpdated 也會因為標題、favicon 等變化觸發，此時 changeInfo 沒有 status 或 url。
  // 那類事件不該影響連線狀態，否則已就緒的連線會被打回 checking 且不再重新查詢。
  if (changeInfo.status === undefined && changeInfo.url === undefined) return;
  if (changeInfo.status === 'loading' && !changeInfo.url && connections[provider].tabId === tabId) {
    rejectWaitersForProvider(provider, new Error(encodeError('error.reloaded', { provider })));
  }
  connections[provider] = { provider, status: 'checking', tabId };
  broadcastConnections();
  // url 變化涵蓋 SPA 內部導覽，那時不會有 status: 'complete' 可等
  if (changeInfo.status === 'complete' || changeInfo.url) void requestTabStatus(provider, tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const provider of PROVIDERS) {
    if (connections[provider].tabId === tabId) {
      rejectWaitersForProvider(provider, new Error(encodeError('error.tab_closed', { provider })));
      connections[provider] = { provider, status: 'disconnected' };
    }
  }
  broadcastConnections();
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  switch (message.action) {
    case 'GET_CONNECTIONS':
      sendResponse(connections);
      // 先回快取讓側邊欄立即有內容，再重新探測一次；結果會透過 broadcastConnections 送達。
      // 沒有這一步的話，快取一旦是 disconnected 就只能等下一次分頁載入事件才會更新。
      void refreshConnections();
      void notifyInterruptedWorkflow(message.payload as { clientId?: string; sessionId?: string } | undefined);
      return true;

    case 'GET_PROVIDER_URLS':
      void getProviderUrls().then(sendResponse).catch(() => sendResponse({}));
      return true;

    case 'RESET_PROVIDER_SESSIONS':
      void resetProviderSessions((message.payload as { providers?: AIProvider[] } | undefined)?.providers)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;

    case 'RESTORE_PROVIDER_SESSIONS':
      void restoreProviderSessions((message.payload as { urls?: Partial<Record<AIProvider, string>> } | undefined)?.urls ?? {})
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;

    case 'STATUS_REPORT': {
      if (!message.provider || !sender.tab?.id) return false;
      const { loggedIn = false } = (message.payload as { loggedIn?: boolean } | undefined) ?? {};
      const current = connections[message.provider];
      if (current.status === 'connected' && current.tabId !== sender.tab.id) return false;
      connections[message.provider] = {
        provider: message.provider,
        status: loggedIn ? 'connected' : 'login-required',
        tabId: sender.tab.id,
      };
      broadcastConnections();
      return false;
    }

    case 'OPEN_LOGIN':
      if (!message.provider) return false;
      focusOrOpenProvider(message.provider)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;

    case 'CANCEL_WORKFLOW':
      if ((message.payload as { clientId?: string } | undefined)?.clientId === activeClientId) {
        abortWorkflow();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
      return true;

    case 'PUBLISH_HACKMD':
      handleHackMDPublish(message.payload as { token: string; title: string; content: string })
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;

    case 'SEND_MESSAGE':
      void handleSendMessage(message.payload as SendParams)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;

    case 'RESPONSE_DONE':
      if (!sender.tab || !message.requestId) return false;
      settleResponseWaiter(message.requestId, message.provider, String(message.payload ?? ''));
      return false;

    case 'RESPONSE_CHUNK':
    case 'ROLE_ASSIGNMENT':
    case 'WORKFLOW_STATUS':
    case 'CHECK_STATUS':
    case 'STOP_GENERATION':
      return false;
  }
});

async function refreshConnections(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const provider of PROVIDERS) connections[provider] = { provider, status: 'disconnected' };

  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    const provider = getProviderFromUrl(tab.url);
    if (!provider) continue;
    connections[provider] = { provider, status: 'checking', tabId: tab.id };
  }
  broadcastConnections();

  await Promise.all(
    PROVIDERS.map(async (provider) => {
      const tabId = connections[provider].tabId;
      if (tabId) await requestTabStatus(provider, tabId);
    }),
  );
}

async function requestTabStatus(provider: AIProvider, tabId: number): Promise<void> {
  try {
    await deliverToTab(provider, tabId, { action: 'CHECK_STATUS', provider });
  } catch {
    connections[provider] = { provider, status: 'disconnected', tabId };
    broadcastConnections();
  }
}

async function deliverToTab(provider: AIProvider, tabId: number, message: ExtensionMessage): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (firstError) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_FILES[provider]] });
      await delay(150);
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (injectError) {
      // Last resort failed: the tab cannot run our content script at all. Surface it —
      // the browser's message (e.g. "Blocked") is the only clue to why the provider
      // never reports its status.
      console.error(`Failed to inject the ${provider} content script into tab ${tabId}`, injectError);
      throw firstError;
    }
  }
}

function getProviderFromUrl(url: string): AIProvider | null {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('grok.com')) return 'grok';
  return null;
}

function broadcastConnections(): void {
  chrome.runtime.sendMessage({ action: 'CONNECTIONS_UPDATE', payload: connections }).catch(() => {});
}

async function focusOrOpenProvider(provider: AIProvider): Promise<void> {
  const connection = connections[provider];
  if (connection.tabId) {
    try {
      const tab = await chrome.tabs.update(connection.tabId, { active: true });
      if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
      // 分頁已經載入完成時不會再有載入事件，必須主動重新查詢；
      // deliverToTab 在訊息送不到時會用 chrome.scripting 重新注入 content script。
      await requestTabStatus(provider, connection.tabId);
      return;
    } catch {
      connections[provider] = { provider, status: 'disconnected' };
    }
  }
  await chrome.tabs.create({ url: AI_PROVIDERS[provider].loginUrl });
}

async function getProviderUrls(): Promise<Partial<Record<AIProvider, string>>> {
  const urls: Partial<Record<AIProvider, string>> = {};
  await Promise.all([...workflowProviders].map(async (provider) => {
    const tabId = connections[provider].tabId;
    if (!tabId) return;
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url && getProviderFromUrl(tab.url) === provider) urls[provider] = tab.url;
    } catch {}
  }));
  return urls;
}

async function resetProviderSessions(targets: AIProvider[] = PROVIDERS): Promise<void> {
  await Promise.all(targets.map(async (provider) => {
    const tabId = connections[provider].tabId;
    if (!tabId) return;
    connections[provider] = { provider, status: 'checking', tabId };
    await chrome.tabs.update(tabId, { url: AI_PROVIDERS[provider].url });
  }));
  broadcastConnections();
}

async function restoreProviderSessions(urls: Partial<Record<AIProvider, string>>): Promise<void> {
  await Promise.all(PROVIDERS.map(async (provider) => {
    const url = urls[provider];
    const tabId = connections[provider].tabId;
    if (!url || !tabId || getProviderFromUrl(url) !== provider) return;
    connections[provider] = { provider, status: 'checking', tabId };
    await chrome.tabs.update(tabId, { url });
  }));
  broadcastConnections();
}

async function sendToProvider(provider: AIProvider, text: string, requestId: string, workflowId: string): Promise<void> {
  const connection = connections[provider];
  if (connection.status !== 'connected' || !connection.tabId) {
    throw new Error(encodeError('error.not_ready', { provider }));
  }
  workflowProviders.add(provider);
  await deliverToTab(provider, connection.tabId, {
    action: 'SEND_MESSAGE',
    provider,
    requestId,
    workflowId,
    payload: { text },
  });
}

async function sendAndWait(provider: AIProvider, text: string, workflowId: string, preserveQuestionLanguage = true): Promise<string> {
  checkAborted(workflowId);
  const requestId = `${workflowId}:${provider}:${crypto.randomUUID()}`;
  const responsePromise = waitForResponse(provider, requestId);
  try {
    const prompt = preserveQuestionLanguage
      ? `${text}\n\nLanguage requirement: answer in the same language as the user's original question.`
      : text;
    await sendToProvider(provider, prompt, requestId, workflowId);
  } catch (error) {
    rejectResponseWaiter(requestId, error instanceof Error ? error : new Error(String(error)));
  }
  const response = await responsePromise;
  const providerError = response.match(/^\[Error:\s*(.+)]$/s);
  if (providerError) throw new Error(providerError[1]);
  return response;
}

function waitForResponse(provider: AIProvider, requestId: string, timeoutMs = 600_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      responseWaiters.delete(requestId);
      reject(new Error(encodeError('error.timeout', { provider, seconds: Math.round(timeoutMs / 1000) })));
    }, timeoutMs);
    responseWaiters.set(requestId, { provider, resolve, reject, timer });
  });
}

function settleResponseWaiter(requestId: string, provider: AIProvider | undefined, response: string): void {
  const waiter = responseWaiters.get(requestId);
  if (!waiter || provider !== waiter.provider) return;
  clearTimeout(waiter.timer);
  responseWaiters.delete(requestId);
  waiter.resolve(response);
}

function rejectResponseWaiter(requestId: string, error: Error): void {
  const waiter = responseWaiters.get(requestId);
  if (!waiter) return;
  clearTimeout(waiter.timer);
  responseWaiters.delete(requestId);
  waiter.reject(error);
}

function rejectWaitersForProvider(provider: AIProvider, error: Error): void {
  for (const [requestId, waiter] of responseWaiters) {
    if (waiter.provider === provider) rejectResponseWaiter(requestId, error);
  }
}

function abortWorkflow(): void {
  workflowAborted = true;
  const abortError = new DOMException('Workflow cancelled', 'AbortError');
  const activeProviders = new Set(Array.from(responseWaiters.values(), (waiter) => waiter.provider));
  for (const [requestId] of responseWaiters) rejectResponseWaiter(requestId, abortError);
  for (const provider of activeProviders) {
    const tabId = connections[provider].tabId;
    if (tabId) void deliverToTab(provider, tabId, { action: 'STOP_GENERATION', provider }).catch(() => {});
  }
  if (activeWorkflowId) sendWorkflowStatus({ key: '', done: true, cancelled: true });
}

function checkAborted(workflowId: string): void {
  if (workflowAborted || activeWorkflowId !== workflowId) throw new DOMException('Workflow cancelled', 'AbortError');
}

async function handleSendMessage(params: SendParams): Promise<void> {
  if (activeWorkflowId) abortWorkflow();
  workflowAborted = false;
  workflowProviders.clear();
  const workflowId = crypto.randomUUID();
  activeWorkflowId = workflowId;
  activeSessionId = params.sessionId;
  activeClientId = params.clientId;
  await chrome.storage.session.set({
    [ACTIVE_WORKFLOW_STORAGE_KEY]: {
      workflowId,
      sessionId: params.sessionId,
      clientId: params.clientId,
      startedAt: Date.now(),
    },
  });
  const question = questionWithConversationContext(params.text, params.context);
  sendWorkflowStatus({ key: 'workflow.starting' }, workflowId, params.sessionId, params.clientId);

  try {
    switch (params.mode) {
      case 'free':
        await handleFreeMode(question, params.targets, workflowId);
        break;
      case 'debate':
        await handleDebateMode(question, (params.roles as DebateRoles) ?? DEFAULT_DEBATE_ROLES, workflowId);
        break;
      case 'consult':
        await handleConsultMode(question, (params.roles as ConsultRoles) ?? DEFAULT_CONSULT_ROLES, workflowId);
        break;
      case 'coding':
        await handleCodingMode(question, (params.roles as CodingRoles) ?? DEFAULT_CODING_ROLES, workflowId);
        break;
      case 'roundtable':
        await handleRoundtableMode(question, (params.roles as RoundtableRoles) ?? DEFAULT_ROUNDTABLE_ROLES, workflowId);
        break;
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) sendSystemError(errorMessage(error), workflowId);
  } finally {
    sendWorkflowStatus({ key: '', done: true, cancelled: workflowAborted }, workflowId, params.sessionId, params.clientId);
    await clearPersistedWorkflow(workflowId);
    if (activeWorkflowId === workflowId) {
      activeWorkflowId = undefined;
      activeSessionId = undefined;
      activeClientId = undefined;
    }
  }
}

async function notifyInterruptedWorkflow(target?: { clientId?: string; sessionId?: string }): Promise<void> {
  if (activeWorkflowId) return;
  const stored = await chrome.storage.session.get(ACTIVE_WORKFLOW_STORAGE_KEY);
  const interrupted = stored[ACTIVE_WORKFLOW_STORAGE_KEY] as { workflowId?: string; sessionId?: string; clientId?: string } | undefined;
  if (!interrupted?.workflowId || !interrupted.sessionId || !interrupted.clientId) return;
  if (!target?.clientId || target.sessionId !== interrupted.sessionId) return;
  sendWorkflowStatus(
    { key: 'workflow.interrupted' },
    interrupted.workflowId,
    interrupted.sessionId,
    target.clientId,
  );
  sendSystemError(encodeError('error.worker_stopped'), interrupted.workflowId);
  sendWorkflowStatus(
    { key: '', done: true, cancelled: false },
    interrupted.workflowId,
    interrupted.sessionId,
    target.clientId,
  );
  await chrome.storage.session.remove(ACTIVE_WORKFLOW_STORAGE_KEY);
}

async function clearPersistedWorkflow(workflowId: string): Promise<void> {
  const stored = await chrome.storage.session.get(ACTIVE_WORKFLOW_STORAGE_KEY);
  const active = stored[ACTIVE_WORKFLOW_STORAGE_KEY] as { workflowId?: string } | undefined;
  if (active?.workflowId === workflowId) await chrome.storage.session.remove(ACTIVE_WORKFLOW_STORAGE_KEY);
}

async function handleFreeMode(text: string, requestedTargets: AIProvider[] | undefined, workflowId: string): Promise<void> {
  const selected = requestedTargets?.length ? requestedTargets : PROVIDERS;
  const targets = selected.filter((provider) => connections[provider].status === 'connected');
  if (targets.length === 0) throw new Error(encodeError('error.no_target'));
  sendWorkflowStatus({ key: 'workflow.free', params: { providers: targets.map((provider) => AI_PROVIDERS[provider].name).join(' · ') } });
  const results = await Promise.allSettled(targets.map((provider) => sendAndWait(provider, text, workflowId, false)));
  checkAborted(workflowId);
  if (results.every((result) => result.status === 'rejected')) throw (results[0] as PromiseRejectedResult).reason;
}

async function handleDebateMode(text: string, roles: DebateRoles, workflowId: string): Promise<void> {
  sendWorkflowStatus(status('workflow.debate.pro', roles.pro));
  sendRoleAssignment(roles.pro, 'role.pro');
  const proResponse = await sendAndWait(roles.pro, PROMPTS.debate.pro(text), workflowId);
  checkAborted(workflowId);

  sendWorkflowStatus(status('workflow.debate.con', roles.con));
  sendRoleAssignment(roles.con, 'role.con');
  const conResponse = await sendAndWait(roles.con, PROMPTS.debate.con(text, proResponse), workflowId);
  checkAborted(workflowId);

  sendWorkflowStatus(status('workflow.debate.judge', roles.judge));
  sendRoleAssignment(roles.judge, 'role.judge');
  const judgeResponse = await sendAndWait(roles.judge, PROMPTS.debate.judge(text, proResponse, conResponse), workflowId);
  checkAborted(workflowId);

  sendWorkflowStatus(status('workflow.debate.summary', roles.summary));
  sendRoleAssignment(roles.summary, 'role.summary');
  await sendAndWait(roles.summary, PROMPTS.debate.summary(text, proResponse, conResponse, judgeResponse), workflowId);
}

async function handleConsultMode(text: string, roles: ConsultRoles, workflowId: string): Promise<void> {
  sendWorkflowStatus({ key: 'workflow.consult.initial', params: { first: name(roles.first), second: name(roles.second) } });
  sendRoleAssignment(roles.first, 'role.first');
  sendRoleAssignment(roles.second, 'role.second');
  const [firstResponse, secondResponse] = await Promise.all([
    sendAndWait(roles.first, PROMPTS.consult.first(text), workflowId),
    sendAndWait(roles.second, PROMPTS.consult.second(text), workflowId),
  ]);
  checkAborted(workflowId);

  sendWorkflowStatus(status('workflow.consult.review', roles.reviewer));
  sendRoleAssignment(roles.reviewer, 'role.reviewer');
  const reviewerResponse = await sendAndWait(
    roles.reviewer,
    PROMPTS.consult.reviewer(text, firstResponse, name(roles.first), secondResponse, name(roles.second)),
    workflowId,
  );
  checkAborted(workflowId);

  sendWorkflowStatus(status('workflow.consult.summary', roles.summary));
  sendRoleAssignment(roles.summary, 'role.summary');
  await sendAndWait(
    roles.summary,
    PROMPTS.consult.summary(text, firstResponse, name(roles.first), secondResponse, name(roles.second), reviewerResponse, name(roles.reviewer)),
    workflowId,
  );
}

async function handleCodingMode(text: string, roles: CodingRoles, workflowId: string): Promise<void> {
  sendCodingStatus(1, roles.planner, 'coding.spec'); sendRoleAssignment(roles.planner, 'role.planner');
  const spec = await sendAndWait(roles.planner, PROMPTS.coding.plannerSpec(text), workflowId); checkAborted(workflowId);
  sendCodingStatus(2, roles.reviewer, 'coding.specReview'); sendRoleAssignment(roles.reviewer, 'role.reviewer');
  const specReview = await sendAndWait(roles.reviewer, PROMPTS.coding.reviewerSpec(text, spec, name(roles.planner)), workflowId); checkAborted(workflowId);
  sendCodingStatus(3, roles.coder, 'coding.codeV1'); sendRoleAssignment(roles.coder, 'role.coder');
  const codeV1 = await sendAndWait(roles.coder, PROMPTS.coding.coderV1(text, spec, name(roles.planner), specReview, name(roles.reviewer)), workflowId); checkAborted(workflowId);
  sendCodingStatus(4, roles.reviewer, 'coding.codeReview'); sendRoleAssignment(roles.reviewer, 'role.reviewer');
  const codeReview = await sendAndWait(roles.reviewer, PROMPTS.coding.reviewerCode(text, codeV1, name(roles.coder)), workflowId); checkAborted(workflowId);
  sendCodingStatus(5, roles.tester, 'coding.test'); sendRoleAssignment(roles.tester, 'role.tester');
  const testReport = await sendAndWait(roles.tester, PROMPTS.coding.testerCases(text, codeV1, name(roles.coder)), workflowId); checkAborted(workflowId);
  sendCodingStatus(6, roles.coder, 'coding.codeV2'); sendRoleAssignment(roles.coder, 'role.coder');
  const codeV2 = await sendAndWait(roles.coder, PROMPTS.coding.coderV2(text, codeV1, codeReview, name(roles.reviewer), testReport, name(roles.tester)), workflowId); checkAborted(workflowId);
  sendCodingStatus(7, roles.planner, 'coding.acceptance'); sendRoleAssignment(roles.planner, 'role.planner');
  const acceptance = await sendAndWait(roles.planner, PROMPTS.coding.plannerAcceptance(text, codeV2, name(roles.coder), spec), workflowId); checkAborted(workflowId);
  sendCodingStatus(8, roles.coder, 'coding.final'); sendRoleAssignment(roles.coder, 'role.coder');
  await sendAndWait(roles.coder, PROMPTS.coding.coderFinal(text, codeV2, acceptance, name(roles.planner)), workflowId);
}

async function handleRoundtableMode(text: string, roles: RoundtableRoles, workflowId: string): Promise<void> {
  const participants: AIProvider[] = [roles.first, roles.second, roles.third, roles.fourth];
  const history: { name: string; round: number; text: string }[] = [];
  for (let round = 1; round <= 5; round += 1) {
    for (const participant of participants) {
      checkAborted(workflowId);
      sendWorkflowStatus({ key: 'workflow.roundtable', params: { round, labelKey: `round.${round}`, provider: name(participant) } });
      sendRoleAssignment(participant, `round.${round}`);
      const response = await sendAndWait(participant, PROMPTS.roundtable.buildPrompt(text, round, name(participant), history), workflowId);
      history.push({ name: name(participant), round, text: response });
    }
  }
}

function sendCodingStatus(current: number, provider: AIProvider, actionKey: string): void {
  sendWorkflowStatus({ key: 'workflow.coding', params: { current, provider: name(provider), actionKey } });
}

function status(key: string, provider: AIProvider): WorkflowStatusPayload {
  return { key, params: { provider: name(provider) } };
}

function name(provider: AIProvider): string {
  return AI_PROVIDERS[provider].name;
}

function sendWorkflowStatus(
  payload: WorkflowStatusPayload,
  workflowId = activeWorkflowId,
  sessionId = activeSessionId,
  clientId = activeClientId,
): void {
  chrome.runtime.sendMessage({
    action: 'WORKFLOW_STATUS',
    payload: { ...payload, workflowId, sessionId, clientId },
  }).catch(() => {});
}

function sendRoleAssignment(provider: AIProvider, labelKey: string): void {
  chrome.runtime.sendMessage({
    action: 'ROLE_ASSIGNMENT',
    provider,
    workflowId: activeWorkflowId,
    payload: { labelKey, sessionId: activeSessionId, clientId: activeClientId },
  }).catch(() => {});
}

function sendSystemError(message: string, workflowId = activeWorkflowId): void {
  chrome.runtime.sendMessage({
    action: 'RESPONSE_DONE',
    provider: 'system' as AIProvider,
    requestId: `system:${crypto.randomUUID()}`,
    workflowId,
    payload: `Error: ${message}`,
  }).catch(() => {});
}

async function handleHackMDPublish(payload: { token: string; title: string; content: string }) {
  const response = await fetch('https://api.hackmd.io/v1/notes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${payload.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      content: payload.content,
      readPermission: 'guest',
      writePermission: 'owner',
      commentPermission: 'disabled',
    }),
  });
  if (!response.ok) throw new Error(encodeError('error.hackmd_failed', { status: response.status, detail: await response.text().catch(() => response.statusText) }));
  const data = (await response.json()) as { id?: string; publishLink?: string };
  const publishLink = data.publishLink || (data.id ? `https://hackmd.io/@/${data.id}/publish` : '');
  if (!publishLink) throw new Error(encodeError('error.hackmd_no_link'));
  return { publishLink, editLink: data.id ? `https://hackmd.io/${data.id}` : '' };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

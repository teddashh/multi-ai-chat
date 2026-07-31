import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AIProvider,
  AIConnection,
  ChatMode,
  ChatMessage,
  Conversation,
  Locale,
  ModeRoles,
  WorkflowStatusPayload,
} from '../shared/types';
import {
  AI_PROVIDERS,
  CHAT_MODES,
  DEFAULT_DEBATE_ROLES,
  DEFAULT_CONSULT_ROLES,
  DEFAULT_CODING_ROLES,
  DEFAULT_ROUNDTABLE_ROLES,
} from '../shared/constants';
import { getLocale, setLocale as setActiveLocale, SUPPORTED_LOCALES, t } from '../shared/i18n';
import { getHackMDToken, publishToHackMD } from '../shared/hackmd';
import { buildConversationReplayContext } from '../shared/conversationContinuity';
import { decodeError, ERROR_MARKER } from '../shared/errors';
import ConnectionBar from './components/ConnectionBar';
import ModeSelector from './components/ModeSelector';
import RoleConfig from './components/RoleConfig';
import ChatArea from './components/ChatArea';
import InputBar from './components/InputBar';
import SettingsModal from './components/SettingsModal';

const PROVIDERS: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok'];
const MAX_CONVERSATIONS = 30;
const DEFAULT_ROLES: Record<Exclude<ChatMode, 'free'>, ModeRoles> = {
  debate: DEFAULT_DEBATE_ROLES,
  consult: DEFAULT_CONSULT_ROLES,
  coding: DEFAULT_CODING_ROLES,
  roundtable: DEFAULT_ROUNDTABLE_ROLES,
};

interface TraceEntry {
  id: string;
  text: string;
  timestamp: number;
}

function emptyConnections(): Record<AIProvider, AIConnection> {
  return Object.fromEntries(PROVIDERS.map((provider) => [provider, { provider, status: 'disconnected' }])) as Record<AIProvider, AIConnection>;
}

function newConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: t('session.untitled'),
    mode: 'free',
    roles: undefined,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function conversationTitle(messages: ChatMessage[]): string {
  const firstQuestion = messages.find((message) => message.role === 'user')?.content.trim();
  if (!firstQuestion) return t('session.untitled');
  return firstQuestion.length > 46 ? `${firstQuestion.slice(0, 46)}…` : firstQuestion;
}

function fitConversationsForStorage(conversations: Conversation[]): Conversation[] {
  const maxBytes = 7_500_000;
  const persisted = [...conversations];
  const size = () => new TextEncoder().encode(JSON.stringify(persisted)).byteLength;
  while (persisted.length > 1 && size() > maxBytes) persisted.pop();
  if (persisted.length === 1 && size() > maxBytes) {
    const conversation = { ...persisted[0], messages: [...persisted[0].messages] };
    while (conversation.messages.length > 2 && new TextEncoder().encode(JSON.stringify(conversation)).byteLength > maxBytes) {
      conversation.messages.shift();
    }
    persisted[0] = conversation;
  }
  return persisted;
}

// 錯誤在背景與 content script 只帶鍵值，這裡是唯一翻譯成使用者語言的地方。
// 沒帶鍵值的（原生例外、HackMD 伺服器回應）原樣顯示。
function humanizeError(text: string): string {
  const info = decodeError(text);
  if (!info) return text;
  const params: Record<string, string | number> = { ...info.params };
  if (typeof params.provider === 'string' && params.provider in AI_PROVIDERS) {
    params.provider = AI_PROVIDERS[params.provider as AIProvider].name;
  }
  return `${ERROR_MARKER} ${t(info.key, params)}`;
}

function buildMarkdown(messages: ChatMessage[], mode: ChatMode): { title: string; content: string } {
  const title = `Multi-AI Chat — ${CHAT_MODES[mode].icon} ${t(`mode.${mode}`)}`;
  const lines = [`# ${title}`, `> Exported: ${new Date().toLocaleString()}`, '', '---', ''];
  for (const message of messages) {
    if (message.role === 'user') {
      lines.push('## 👤 User', '', ...message.content.split('\n').map((line) => `> ${line}`));
    } else {
      const provider = message.provider as string | undefined;
      const providerName = provider && provider in AI_PROVIDERS ? AI_PROVIDERS[provider as AIProvider].name : t('chat.system');
      const role = message.modeRole ? ` (${t(message.modeRole)})` : '';
      lines.push(`## 🤖 ${providerName}${role}`, '', message.content);
    }
    lines.push('', '---', '');
  }
  return { title, content: lines.join('\n') };
}

function formatWorkflowStatus(status: WorkflowStatusPayload): string {
  const params = { ...(status.params ?? {}) };
  if (typeof params.actionKey === 'string') params.action = t(params.actionKey);
  if (typeof params.labelKey === 'string') params.label = t(params.labelKey);
  return t(status.key, params);
}

export default function App() {
  const [connections, setConnections] = useState<Record<AIProvider, AIConnection>>(emptyConnections);
  const [mode, setMode] = useState<ChatMode>('free');
  const [roles, setRoles] = useState<ModeRoles>(DEFAULT_DEBATE_ROLES);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [freeTargets, setFreeTargets] = useState<AIProvider[]>(PROVIDERS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusPayload | null>(null);
  const [trace, setTrace] = useState<TraceEntry[]>([]);
  const [showRoleConfig, setShowRoleConfig] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [locale, setLocale] = useState<Locale>(getLocale());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState('');
  const [providerUrls, setProviderUrls] = useState<Partial<Record<AIProvider, string>>>({});
  const [contextNeedsReplay, setContextNeedsReplay] = useState(false);
  const [conversationDrawerOpen, setConversationDrawerOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const pendingRolesRef = useRef<Record<string, string>>({});
  const clientIdRef = useRef(crypto.randomUUID());
  const activeConversationIdRef = useRef('');
  const activeWorkflowIdRef = useRef<string>();
  const ignoredWorkflowIdsRef = useRef(new Set<string>());

  useEffect(() => {
    pendingRolesRef.current = pendingRoles;
  }, [pendingRoles]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    chrome.storage.local.get(['language', 'conversations', 'activeConversationId', 'freeTargets'], (stored) => {
      const savedLocale = stored.language as Locale | undefined;
      if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        setActiveLocale(savedLocale);
        setLocale(savedLocale);
      }

      const savedTargets = Array.isArray(stored.freeTargets)
        ? stored.freeTargets.filter((provider): provider is AIProvider => PROVIDERS.includes(provider as AIProvider))
        : PROVIDERS;
      setFreeTargets(savedTargets.length ? savedTargets : PROVIDERS);

      const savedConversations = Array.isArray(stored.conversations) ? stored.conversations as Conversation[] : [];
      const selected = savedConversations.find((conversation) => conversation.id === stored.activeConversationId) ?? savedConversations[0] ?? newConversation();
      const initial = savedConversations.length ? savedConversations : [selected];
      setConversations(initial);
      setActiveConversationId(selected.id);
      setMode(selected.mode);
      setRoles(selected.roles ?? (selected.mode === 'free' ? DEFAULT_DEBATE_ROLES : DEFAULT_ROLES[selected.mode]));
      setMessages(selected.messages ?? []);
      setProviderUrls(selected.providerUrls ?? {});
      setContextNeedsReplay(Boolean(selected.messages?.length));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || !activeConversationId) return;
    chrome.runtime.sendMessage({ action: 'GET_CONNECTIONS', payload: { clientId: clientIdRef.current, sessionId: activeConversationId } }, (response) => {
      if (response) setConnections(response as Record<AIProvider, AIConnection>);
    });
  }, [activeConversationId, hydrated]);

  useEffect(() => {
    let stopped = false;
    let port: chrome.runtime.Port | undefined;
    let reconnectTimer: number | undefined;
    const connect = () => {
      if (stopped) return;
      port = chrome.runtime.connect({ name: 'multi-ai-sidepanel' });
      port.onDisconnect.addListener(() => {
        port = undefined;
        if (!stopped) reconnectTimer = window.setTimeout(connect, 1000);
      });
    };
    connect();
    const heartbeat = window.setInterval(() => {
      try {
        port?.postMessage({ type: 'heartbeat' });
      } catch {
        port = undefined;
      }
    }, 20_000);
    return () => {
      stopped = true;
      window.clearInterval(heartbeat);
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      port?.disconnect();
    };
  }, []);

  useEffect(() => {
    const listener = (message: { action: string; provider?: AIProvider; requestId?: string; workflowId?: string; payload?: unknown }) => {
      switch (message.action) {
        case 'CONNECTIONS_UPDATE':
          setConnections(message.payload as Record<AIProvider, AIConnection>);
          break;
        case 'ROLE_ASSIGNMENT': {
          const { labelKey, sessionId, clientId } = message.payload as { labelKey: string; sessionId?: string; clientId?: string };
          if (clientId !== clientIdRef.current || sessionId !== activeConversationIdRef.current || message.workflowId !== activeWorkflowIdRef.current) break;
          if (message.provider) {
            setPendingRoles((current) => {
              const next = { ...current, [message.provider as string]: labelKey };
              pendingRolesRef.current = next;
              return next;
            });
          }
          break;
        }
        case 'RESPONSE_CHUNK':
          if (!message.provider || !acceptWorkflowMessage(message.workflowId, activeWorkflowIdRef, ignoredWorkflowIdsRef)) break;
          setMessages((current) => upsertStreamingMessage(current, message.provider!, message.requestId, String(message.payload ?? ''), pendingRolesRef, setPendingRoles));
          break;
        case 'RESPONSE_DONE':
          if (!message.provider || !acceptWorkflowMessage(message.workflowId, activeWorkflowIdRef, ignoredWorkflowIdsRef)) break;
          setMessages((current) => finalizeMessage(current, message.provider!, message.requestId, humanizeError(String(message.payload ?? '')), pendingRolesRef, setPendingRoles));
          break;
        case 'WORKFLOW_STATUS': {
          const status = message.payload as WorkflowStatusPayload;
          if (!status || status.clientId !== clientIdRef.current || status.sessionId !== activeConversationIdRef.current || !status.workflowId) break;
          if (ignoredWorkflowIdsRef.current.has(status.workflowId)) break;
          if (status.done) {
            if (status.cancelled) {
              ignoreWorkflow(status.workflowId, ignoredWorkflowIdsRef);
              if (activeWorkflowIdRef.current === status.workflowId) activeWorkflowIdRef.current = undefined;
            }
            setWorkflowStatus(null);
            setIsProcessing(false);
            if (!status.cancelled) {
              chrome.runtime.sendMessage({ action: 'GET_PROVIDER_URLS' })
                // 背景只回這輪用過的 provider，要疊加而不是覆蓋，否則同一個對話先前記過的網址會掉
                .then((urls) => setProviderUrls((current) => ({ ...current, ...(urls as Partial<Record<AIProvider, string>>) })))
                .catch(() => {});
            }
            break;
          }
          activeWorkflowIdRef.current = status.workflowId;
          setWorkflowStatus(status);
          const text = formatWorkflowStatus(status);
          setTrace((current) => current[current.length - 1]?.text === text ? current : [...current, { id: crypto.randomUUID(), text, timestamp: Date.now() }].slice(-25));
          break;
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeConversationId) return;
    let snapshot: Conversation[] | undefined;
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === activeConversationId);
      const updated: Conversation = {
        id: activeConversationId,
        title: conversationTitle(messages),
        mode,
        roles: mode === 'free' ? undefined : roles,
        messages,
        providerUrls,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      const next = [updated, ...current.filter((conversation) => conversation.id !== activeConversationId)]
        .sort((first, second) => second.updatedAt - first.updatedAt)
        .slice(0, MAX_CONVERSATIONS);
      snapshot = fitConversationsForStorage(next);
      return next;
    });
    const persist = () => {
      if (snapshot) void chrome.storage.local.set({ conversations: snapshot, activeConversationId }).catch(() => {});
    };
    const timer = window.setTimeout(persist, 350);
    return () => {
      window.clearTimeout(timer);
      persist();
    };
  }, [activeConversationId, hydrated, messages, mode, providerUrls, roles]);

  const changeMode = (nextMode: ChatMode) => {
    if (isProcessing) return;
    setMode(nextMode);
    setShowRoleConfig(false);
    if (nextMode !== 'free') setRoles(DEFAULT_ROLES[nextMode]);
  };

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || isProcessing) return;
    if (activeWorkflowIdRef.current) ignoreWorkflow(activeWorkflowIdRef.current, ignoredWorkflowIdsRef);
    activeWorkflowIdRef.current = undefined;
    const context = contextNeedsReplay ? buildConversationReplayContext(messages) : undefined;
    setMessages((current) => [...current, { id: `user-${crypto.randomUUID()}`, role: 'user', content: text, timestamp: Date.now() }]);
    setIsProcessing(true);
    setWorkflowStatus(null);
    setContextNeedsReplay(false);
    chrome.runtime.sendMessage({
      action: 'SEND_MESSAGE',
      payload: {
        text,
        context,
        mode,
        roles: mode === 'free' ? undefined : roles,
        targets: mode === 'free' ? freeTargets : undefined,
        sessionId: activeConversationId,
        clientId: clientIdRef.current,
      },
    }).catch((error) => {
      setMessages((current) => [...current, { id: `system-${crypto.randomUUID()}`, role: 'ai', provider: 'system' as AIProvider, content: `${ERROR_MARKER} ${String(error)}`, timestamp: Date.now() }]);
      setIsProcessing(false);
    });
  }, [activeConversationId, contextNeedsReplay, freeTargets, isProcessing, messages, mode, roles]);

  const stopWorkflow = useCallback(() => {
    if (activeWorkflowIdRef.current) ignoreWorkflow(activeWorkflowIdRef.current, ignoredWorkflowIdsRef);
    activeWorkflowIdRef.current = undefined;
    chrome.runtime.sendMessage({ action: 'CANCEL_WORKFLOW', payload: { clientId: clientIdRef.current } }).catch(() => {});
    setWorkflowStatus(null);
    setIsProcessing(false);
  }, []);

  // notes: 只有真的回答過的 AI 需要重設分頁；沒用到的分頁不去動它，使用者可能正在上面看別的東西
  const answeredProviders = (): AIProvider[] => [...new Set(
    messages.map((message) => message.provider).filter((provider): provider is AIProvider => Boolean(provider) && (provider as string) !== 'system'),
  )];

  const closeDrawer = () => {
    setConversationDrawerOpen(false);
    setDeleteTargetId('');
  };

  const startNewConversation = () => {
    if (isProcessing) return;
    if (activeWorkflowIdRef.current) ignoreWorkflow(activeWorkflowIdRef.current, ignoredWorkflowIdsRef);
    activeWorkflowIdRef.current = undefined;
    // notes: 已經有空對話就重用它，只更新時間，避免堆出一串重複的「新對話」
    const reusable = conversations.find((candidate) => !candidate.messages?.length);
    const conversation = reusable ?? newConversation();
    setConversations((current) => reusable
      ? current.map((candidate) => candidate.id === reusable.id ? { ...candidate, updatedAt: Date.now() } : candidate)
      : [conversation, ...current].slice(0, MAX_CONVERSATIONS));
    setActiveConversationId(conversation.id);
    activeConversationIdRef.current = conversation.id;
    setMessages([]);
    setProviderUrls({});
    setContextNeedsReplay(false);
    setMode('free');
    setRoles(DEFAULT_DEBATE_ROLES);
    setTrace([]);
    setWorkflowStatus(null);
    closeDrawer();
    setConnectionsOpen(true);
    chrome.runtime.sendMessage({ action: 'RESET_PROVIDER_SESSIONS', payload: { providers: answeredProviders() } }).catch(() => {});
  };

  const selectConversation = (conversation: Conversation) => {
    if (isProcessing) return;
    if (activeWorkflowIdRef.current) ignoreWorkflow(activeWorkflowIdRef.current, ignoredWorkflowIdsRef);
    activeWorkflowIdRef.current = undefined;
    setActiveConversationId(conversation.id);
    activeConversationIdRef.current = conversation.id;
    setMessages(conversation.messages ?? []);
    setProviderUrls(conversation.providerUrls ?? {});
    setContextNeedsReplay(Boolean(conversation.messages?.length));
    setMode(conversation.mode);
    setRoles(conversation.roles ?? (conversation.mode === 'free' ? DEFAULT_DEBATE_ROLES : DEFAULT_ROLES[conversation.mode]));
    setTrace([]);
    const action = conversation.providerUrls && Object.keys(conversation.providerUrls).length
      ? { action: 'RESTORE_PROVIDER_SESSIONS', payload: { urls: conversation.providerUrls } }
      : { action: 'RESET_PROVIDER_SESSIONS', payload: { providers: answeredProviders() } };
    chrome.runtime.sendMessage(action).catch(() => {});
  };

  const deleteConversation = (id: string) => {
    if (isProcessing) return;
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    setDeleteTargetId('');
    void chrome.storage.local.set({ conversations: fitConversationsForStorage(remaining) }).catch(() => {});
    if (id !== activeConversationId) return;
    if (remaining.length) selectConversation(remaining[0]);
    else startNewConversation();
  };

  const changeLocale = (nextLocale: Locale) => {
    setActiveLocale(nextLocale);
    setLocale(nextLocale);
    void chrome.storage.local.set({ language: nextLocale });
  };

  const toggleTarget = (provider: AIProvider) => {
    if (isProcessing) return;
    setFreeTargets((current) => {
      const next = current.includes(provider) ? current.filter((candidate) => candidate !== provider) : [...current, provider];
      const safeNext = next.length ? next : [provider];
      void chrome.storage.local.set({ freeTargets: safeNext });
      return safeNext;
    });
  };

  const openLogin = async (provider: AIProvider): Promise<void> => {
    const response = await chrome.runtime.sendMessage({ action: 'OPEN_LOGIN', provider }) as { ok?: boolean; error?: string } | undefined;
    if (response && response.ok === false) throw new Error(response.error ?? provider);
  };

  const connectAll = () => {
    const pending = PROVIDERS.filter((provider) => connections[provider].status !== 'connected');
    Promise.all(pending.map(openLogin))
      .then(() => setConnectionsOpen(false))
      .catch(() => {});
  };

  const exportConversation = () => {
    if (!messages.length) return;
    const { content } = buildMarkdown(messages, mode);
    const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `multi-ai-chat-${mode}-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.md`;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  };

  const publishConversation = async () => {
    if (!messages.length) return alert(t('publish.empty'));
    const token = await getHackMDToken();
    if (!token) {
      alert(t('publish.no_token'));
      setIsSettingsOpen(true);
      return;
    }
    setIsPublishing(true);
    try {
      const { title, content } = buildMarkdown(messages, mode);
      const { publishLink } = await publishToHackMD(`${title} — ${new Date().toLocaleString()}`, content, token);
      await navigator.clipboard.writeText(publishLink).catch(() => {});
      alert(`${t('publish.success')}\n\n${publishLink}`);
      window.open(publishLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      alert(`${t('publish.failed')} ${humanizeError(String(error))}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const connectedCount = PROVIDERS.filter((provider) => connections[provider].status === 'connected').length;
  const noReadyProvider = connectedCount === 0;
  const serialModeReady = mode === 'free' || Object.values(roles as unknown as Record<string, AIProvider>)
    .every((provider) => connections[provider]?.status === 'connected');
  const currentStatus = workflowStatus ? formatWorkflowStatus(workflowStatus) : t('trace.idle');

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="flex-none border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => conversationDrawerOpen ? closeDrawer() : setConversationDrawerOpen(true)} className="rounded-lg hover:bg-slate-100" title={t('app.menu')} aria-label={t('app.menu')} aria-expanded={conversationDrawerOpen}><BrandMark /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900">{t('app.title')}</h1>
            <p className="truncate text-xs text-slate-500">{t('app.subtitle')}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{connectedCount}/4 {t('app.connected')}</span>
          <button type="button" onClick={() => setIsSettingsOpen(true)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title={t('app.settings')}>⚙</button>
        </div>
      </header>

      <section className="max-h-[46vh] flex-none overflow-y-auto border-b border-slate-200 bg-white px-3 py-3">
        <ModeSelector mode={mode} onModeChange={changeMode} disabled={isProcessing} />

        {mode === 'free' && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('targets.title')}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PROVIDERS.map((provider) => {
                const selected = freeTargets.includes(provider);
                const ready = connections[provider].status === 'connected';
                return <button key={provider} type="button" disabled={isProcessing} onClick={() => toggleTarget(provider)} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${selected ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-400'}`}><span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-slate-300'}`} />{AI_PROVIDERS[provider].name}</button>;
              })}
            </div>
          </div>
        )}

        {mode !== 'free' && (
          <div className="mt-2">
            <button type="button" onClick={() => setShowRoleConfig((current) => !current)} className="text-xs font-medium text-sky-700 hover:text-sky-900">{showRoleConfig ? t('roles.toggle.hide') : t('roles.toggle.show')}</button>
            {showRoleConfig && <RoleConfig mode={mode} roles={roles} onRolesChange={setRoles} />}
          </div>
        )}

        <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50" open={connectionsOpen} onToggle={(event) => setConnectionsOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
            {t('connection.title')}
            {/* notes: float keeps the native ▸ marker; display:flex on summary would drop it */}
            <button type="button" onClick={(event) => { event.preventDefault(); connectAll(); }} disabled={connectedCount === 4} className="float-right rounded-lg bg-sky-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">{t('connection.connect_all')}</button>
          </summary>
          <div className="border-t border-slate-200 p-2.5">
            <ConnectionBar connections={connections} onOpenLogin={(provider) => { void openLogin(provider).catch(() => {}); }} />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('connection.help')}</p>
          </div>
        </details>

        <details className="mt-2 rounded-lg border border-slate-200 bg-white" open={isProcessing}>
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700"><span className={`mr-2 inline-block h-2 w-2 rounded-full ${isProcessing ? 'animate-pulse bg-sky-500' : 'bg-emerald-500'}`} />{t('trace.title')} · <span className="font-normal text-slate-500">{currentStatus}</span></summary>
          {trace.length > 0 && <div className="max-h-28 space-y-1 overflow-y-auto border-t border-slate-200 p-2.5">{trace.slice(-8).map((entry) => <div key={entry.id} className="truncate text-[11px] text-slate-600">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {entry.text}</div>)}</div>}
        </details>
      </section>

      <ChatArea messages={messages} mode={mode} conversationId={activeConversationId} />

      <div className="flex-none border-t border-slate-200 bg-white px-3 py-1.5">
        <div className="flex justify-end gap-3 text-xs text-slate-500">
          <button type="button" onClick={exportConversation} disabled={!messages.length} className="hover:text-sky-700 disabled:opacity-30">{t('app.export')}</button>
          <button type="button" onClick={() => void publishConversation()} disabled={!messages.length || isPublishing} className="hover:text-sky-700 disabled:opacity-30">{isPublishing ? t('publish.publishing') : t('app.publish')}</button>
        </div>
      </div>
      <InputBar onSend={handleSend} onCancel={stopWorkflow} disabled={isProcessing || noReadyProvider || !serialModeReady} isProcessing={isProcessing} />

      {conversationDrawerOpen && (
        <div className="absolute inset-0 z-40 bg-black/30" onClick={closeDrawer}>
          <aside className="flex h-full w-[86%] max-w-sm flex-col border-r border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              <BrandMark />
              <h2 className="flex-1 text-sm font-semibold">{t('session.history')}</h2>
              <button type="button" onClick={closeDrawer} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">{t('app.close')}</button>
            </div>
            <div className="p-3"><button type="button" disabled={isProcessing} onClick={startNewConversation} className="w-full rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-left text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50">＋ {t('app.new')}</button></div>
            <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
              {conversations.length === 0 && <p className="p-3 text-xs text-slate-500">{t('session.empty')}</p>}
              {conversations.map((conversation) => (
                <div key={conversation.id} className="flex items-center gap-1">
                  <button type="button" disabled={isProcessing} onClick={() => { selectConversation(conversation); setDeleteTargetId(conversation.id); }} className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left ${conversation.id === activeConversationId ? 'bg-sky-50 text-sky-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span className="block truncate text-xs font-medium">{conversation.title || t('session.untitled')}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{new Date(conversation.updatedAt || conversation.createdAt).toLocaleString()}</span>
                  </button>
                  {deleteTargetId === conversation.id && <button type="button" disabled={isProcessing} onClick={() => deleteConversation(conversation.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-300 bg-red-50 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-40" title={t('session.delete')} aria-label={t('session.delete')}>✕</button>}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} locale={locale} onLocaleChange={changeLocale} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function BrandMark() {
  return <span className="grid h-8 w-8 shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-slate-50 p-1.5" aria-hidden="true"><span className="rounded-full bg-sky-500" /><span className="rounded-full bg-rose-500" /><span className="rounded-full bg-amber-400" /><span className="rounded-full bg-emerald-500" /></span>;
}

function upsertStreamingMessage(
  messages: ChatMessage[],
  provider: AIProvider,
  requestId: string | undefined,
  content: string,
  pendingRolesRef: React.MutableRefObject<Record<string, string>>,
  setPendingRoles: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): ChatMessage[] {
  const existing = messages.find((message) => message.requestId === requestId && message.id.endsWith('-streaming'));
  if (existing) return messages.map((message) => message.id === existing.id ? { ...message, content } : message);
  const modeRole = consumePendingRole(provider, pendingRolesRef, setPendingRoles);
  return [...messages, { id: `${requestId ?? crypto.randomUUID()}-streaming`, role: 'ai', provider, modeRole, content, timestamp: Date.now(), requestId }];
}

function finalizeMessage(
  messages: ChatMessage[],
  provider: AIProvider,
  requestId: string | undefined,
  content: string,
  pendingRolesRef: React.MutableRefObject<Record<string, string>>,
  setPendingRoles: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): ChatMessage[] {
  const existing = messages.find((message) => message.requestId === requestId && message.id.endsWith('-streaming'));
  if (existing) return messages.map((message) => message.id === existing.id ? { ...message, id: message.id.replace(/-streaming$/, ''), content } : message);
  const modeRole = consumePendingRole(provider, pendingRolesRef, setPendingRoles);
  return [...messages, { id: requestId ?? crypto.randomUUID(), role: 'ai', provider, modeRole, content, timestamp: Date.now(), requestId }];
}

function consumePendingRole(
  provider: AIProvider,
  pendingRolesRef: React.MutableRefObject<Record<string, string>>,
  setPendingRoles: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): string | undefined {
  const role = pendingRolesRef.current[provider];
  if (!role) return undefined;
  setPendingRoles((current) => {
    const next = { ...current };
    delete next[provider];
    pendingRolesRef.current = next;
    return next;
  });
  return role;
}

function acceptWorkflowMessage(
  workflowId: string | undefined,
  activeWorkflowIdRef: React.MutableRefObject<string | undefined>,
  ignoredWorkflowIdsRef: React.MutableRefObject<Set<string>>,
): boolean {
  return Boolean(workflowId && workflowId === activeWorkflowIdRef.current && !ignoredWorkflowIdsRef.current.has(workflowId));
}

function ignoreWorkflow(workflowId: string, ignoredWorkflowIdsRef: React.MutableRefObject<Set<string>>): void {
  const ignored = ignoredWorkflowIdsRef.current;
  ignored.add(workflowId);
  while (ignored.size > 100) {
    const oldest = ignored.values().next().value as string | undefined;
    if (!oldest) break;
    ignored.delete(oldest);
  }
}

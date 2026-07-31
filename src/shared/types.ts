// === AI Providers ===

export type AIProvider = 'chatgpt' | 'claude' | 'gemini' | 'grok';
export type Locale = 'en' | 'zh-TW' | 'ja' | 'de' | 'ko';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface AIConnection {
  provider: AIProvider;
  status: 'connected' | 'disconnected' | 'checking' | 'login-required';
  tabId?: number;
}

// === Chat Modes ===

export type ChatMode = 'free' | 'debate' | 'consult' | 'coding' | 'roundtable';

// 四方辯證
export interface DebateRoles {
  pro: AIProvider;      // 正方
  con: AIProvider;      // 反方
  judge: AIProvider;    // 判官（評論雙方論點強弱）
  summary: AIProvider;  // 總結
}

// 多方諮詢
export interface ConsultRoles {
  first: AIProvider;    // 先答 A
  second: AIProvider;   // 先答 B
  reviewer: AIProvider; // 審查
  summary: AIProvider;  // 總結
}

// Coding 模式
export interface CodingRoles {
  planner: AIProvider;  // 規劃者
  reviewer: AIProvider; // 審查者
  coder: AIProvider;    // 執行+品管
  tester: AIProvider;   // 測試員（出測試案例 + 挑 bug）
}

// 道理辯證 (5 rounds × 4 人)
export interface RoundtableRoles {
  first: AIProvider;   // 每輪第一位發言
  second: AIProvider;  // 每輪第二位發言
  third: AIProvider;   // 每輪第三位發言
  fourth: AIProvider;  // 每輪第四位發言
}

export type ModeRoles = DebateRoles | ConsultRoles | CodingRoles | RoundtableRoles;

// === Messages ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  provider?: AIProvider;
  modeRole?: string; // 'pro' | 'con' | 'summary' | 'first' | 'reviewer' | 'planner' | 'coder' etc.
  content: string;
  timestamp: number;
  requestId?: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  roles?: ModeRoles;
  messages: ChatMessage[];
  providerUrls?: Partial<Record<AIProvider, string>>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStatusPayload {
  key: string;
  params?: Record<string, string | number>;
  workflowId?: string;
  sessionId?: string;
  clientId?: string;
  done?: boolean;
  cancelled?: boolean;
}

// === Chrome Message Passing ===

export type MessageAction =
  | 'CHECK_STATUS'
  | 'STATUS_REPORT'
  | 'SEND_MESSAGE'
  | 'RESPONSE_CHUNK'
  | 'RESPONSE_DONE'
  | 'OPEN_LOGIN'
  | 'GET_CONNECTIONS'
  | 'GET_PROVIDER_URLS'
  | 'RESET_PROVIDER_SESSIONS'
  | 'RESTORE_PROVIDER_SESSIONS'
  | 'CONNECTIONS_UPDATE'
  | 'WORKFLOW_STATUS'
  | 'ROLE_ASSIGNMENT'
  | 'CANCEL_WORKFLOW'
  | 'STOP_GENERATION'
  | 'PUBLISH_HACKMD';

export interface ExtensionMessage {
  action: MessageAction;
  provider?: AIProvider;
  requestId?: string;
  workflowId?: string;
  payload?: unknown;
}

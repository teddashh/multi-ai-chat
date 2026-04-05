// === AI Providers ===

export type AIProvider = 'chatgpt' | 'claude' | 'gemini';

export interface AIConnection {
  provider: AIProvider;
  status: 'connected' | 'disconnected' | 'checking';
  tabId?: number;
}

// === Chat Modes ===

export type ChatMode = 'free' | 'debate' | 'consult' | 'coding';

// 三方辯證
export interface DebateRoles {
  pro: AIProvider;      // 正方
  con: AIProvider;      // 反方
  summary: AIProvider;  // 總結
}

// 多方諮詢
export interface ConsultRoles {
  first: AIProvider;    // 先答
  reviewer: AIProvider; // 審查
  summary: AIProvider;  // 總結
}

// Coding 模式
export interface CodingRoles {
  planner: AIProvider;  // 規劃者
  reviewer: AIProvider; // 審查者
  coder: AIProvider;    // 執行+品管
}

export type ModeRoles = DebateRoles | ConsultRoles | CodingRoles;

// === Messages ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  provider?: AIProvider;
  modeRole?: string; // 'pro' | 'con' | 'summary' | 'first' | 'reviewer' | 'planner' | 'coder' etc.
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  mode: ChatMode;
  roles?: ModeRoles;
  messages: ChatMessage[];
  createdAt: number;
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
  | 'CONNECTIONS_UPDATE'
  | 'WORKFLOW_STATUS'
  | 'ROLE_ASSIGNMENT'
  | 'CANCEL_WORKFLOW';

export interface ExtensionMessage {
  action: MessageAction;
  provider?: AIProvider;
  payload?: unknown;
}

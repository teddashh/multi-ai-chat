import type { AIProvider, ChatMode, DebateRoles, ConsultRoles, CodingRoles } from './types';

// === AI Provider Info ===

export const AI_PROVIDERS: Record<AIProvider, {
  name: string;
  url: string;
  loginUrl: string;
  color: string;
}> = {
  chatgpt: {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    loginUrl: 'https://chatgpt.com/auth/login',
    color: '#10a37f',
  },
  claude: {
    name: 'Claude',
    url: 'https://claude.ai',
    loginUrl: 'https://claude.ai/login',
    color: '#d97706',
  },
  gemini: {
    name: 'Gemini',
    url: 'https://gemini.google.com',
    loginUrl: 'https://gemini.google.com/app',
    color: '#4285f4',
  },
};

// === Mode Definitions ===

export const CHAT_MODES: Record<ChatMode, {
  name: string;
  description: string;
  icon: string;
  serial: boolean; // true = 串行, false = 平行
}> = {
  free: {
    name: '自由模式',
    description: '同時發給三家，各自獨立回答',
    icon: '⚡',
    serial: false,
  },
  debate: {
    name: '三方辯證',
    description: '正方 → 反方反駁 → 總結綜合',
    icon: '⚔️',
    serial: true,
  },
  consult: {
    name: '多方諮詢',
    description: '先答 → 審查補充 → 總結研究',
    icon: '🔍',
    serial: true,
  },
  coding: {
    name: 'Coding 模式',
    description: '規劃 → 審查挑戰 → 執行+品管',
    icon: '💻',
    serial: true,
  },
};

// === Default Role Assignments ===

export const DEFAULT_DEBATE_ROLES: DebateRoles = {
  pro: 'chatgpt',
  con: 'claude',
  summary: 'gemini',
};

export const DEFAULT_CONSULT_ROLES: ConsultRoles = {
  first: 'chatgpt',
  reviewer: 'claude',
  summary: 'gemini',
};

export const DEFAULT_CODING_ROLES: CodingRoles = {
  planner: 'gemini',
  reviewer: 'chatgpt',
  coder: 'claude',
};

// === Prompt Templates for Serial Modes ===

export const PROMPTS = {
  debate: {
    pro: (question: string) =>
      `請從支持、贊同的角度回答以下問題，提出你最強的論點：\n\n${question}`,
    con: (question: string, proResponse: string) =>
      `使用者問了：「${question}」\n\n正方提出了以下觀點：\n${proResponse}\n\n請從反方的角度，針對以上正方觀點提出反駁，指出其論點的弱點和盲點。`,
    summary: (question: string, proResponse: string, conResponse: string) =>
      `使用者問了：「${question}」\n\n正方觀點：\n${proResponse}\n\n反方觀點：\n${conResponse}\n\n請總結正反雙方的論點，指出各自的優缺點，並補上你自己的觀點和結論。`,
  },
  consult: {
    first: (question: string) => question,
    reviewer: (question: string, firstResponse: string, firstName: string) =>
      `使用者問了：「${question}」\n\n${firstName} 的回答：\n${firstResponse}\n\n請檢查他說的對不對，有沒有遺漏或錯誤。也請你做些研究，回答使用者的問題。`,
    summary: (question: string, firstResponse: string, firstName: string, reviewerResponse: string, reviewerName: string) =>
      `使用者問了：「${question}」\n\n${firstName} 的回答：\n${firstResponse}\n\n${reviewerName} 的回答：\n${reviewerResponse}\n\n請檢查他們說的對不對，總結他們的說法，並做點研究補上你自己的答案。`,
  },
  coding: {
    planner: (question: string) =>
      `你是一個軟體架構規劃師。請針對以下需求，寫出完整的實作計畫，包含：\n1. 需求分析\n2. 技術選型\n3. 檔案結構\n4. 每個檔案的詳細實作步驟和偽代碼\n5. 可能的 edge cases\n\n計畫要完整到「不需要再問問題就能直接寫 code」。\n\n需求：${question}`,
    reviewer: (question: string, planResponse: string, plannerName: string) =>
      `你是一個嚴格的 code reviewer。${plannerName} 針對以下需求寫了一份實作計畫：\n\n需求：${question}\n\n計畫：\n${planResponse}\n\n請嚴格審查這份計畫：\n1. 有沒有邏輯漏洞？\n2. 有沒有 edge cases 沒考慮到？\n3. 有沒有安全性問題？\n4. 架構設計合理嗎？\n5. 有沒有更好的做法？\n\n不要當好人，你的工作就是挑毛病。`,
    coder: (question: string, planResponse: string, plannerName: string, reviewResponse: string, reviewerName: string) =>
      `你是一個資深工程師。以下是一個開發任務：\n\n需求：${question}\n\n${plannerName} 的實作計畫：\n${planResponse}\n\n${reviewerName} 的審查意見：\n${reviewResponse}\n\n請根據計畫和審查意見，寫出完整的實作代碼。同時做品質把關：\n1. 確保所有審查意見中提到的問題都已處理\n2. 補上必要的錯誤處理和 edge cases\n3. 如果計畫或審查有矛盾，用你的專業判斷做最好的選擇`,
  },
};

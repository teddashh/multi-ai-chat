import type { AIProvider, ChatMode, DebateRoles, ConsultRoles, CodingRoles, RoundtableRoles } from './types';

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
  roundtable: {
    name: '道理辯證',
    description: '5 輪辯證螺旋，真理越辯越明',
    icon: '🔄',
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

export const DEFAULT_ROUNDTABLE_ROLES: RoundtableRoles = {
  first: 'chatgpt',
  second: 'claude',
  third: 'gemini',
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
  roundtable: {
    /**
     * 辯證螺旋 (Dialectical Spiral) — 5 輪 × 3 人
     *
     * 溫度曲線：
     *   Round 1: 開場立論（中度發散 — 各自表態，選一個獨特角度）
     *   Round 2: 交叉質疑（高度發散 — 攻擊弱點，但承認好的部分）
     *   Round 3: 攻防深化（中高度 — 回應質疑，修正被說服的點）
     *   Round 4: 核心收斂（中度收斂 — 區分真分歧 vs 假分歧）
     *   Round 5: 真理浮現（高度收斂 — 最終結論，坦承立場變化）
     *
     * 每輪每人 prompt 同時施加三個力：
     *   收斂力 — 「你同意什麼」
     *   發散力 — 「你仍然不同意什麼」
     *   演進力 — 「你有什麼新洞察」
     */
    buildPrompt: (
      question: string,
      round: number,
      speakerName: string,
      history: { name: string; round: number; text: string }[]
    ): string => {
      const roundInstructions: Record<number, string> = {
        1: `你是 ${speakerName}。這是一場五輪辯證，三位 AI 輪流發言，目標是「真理越辯越明」。\n\n【第一輪・開場立論】\n請針對以下議題，提出你獨特的觀點和立場。選一個你最有信心的角度深入闘述，不要試圖面面俱到。\n\n要求：有明確立場、有具體論據、有邏輯推演。請精煉你的論點（建議 300-500 字）。`,

        2: `你是 ${speakerName}。\n\n【第二輪・交叉質疑】\n請仔細讀完其他人第一輪的論點，然後：\n1. 指出你認為最有問題的 1-2 個論點，具體說明為什麼不同意\n2. 承認哪些點你覺得說得有道理（不能跳過這步）\n3. 提出一個其他人都沒提到的新角度\n\n不要全盤否定，也不要和稀泥。要有建設性的衝突。`,

        3: `你是 ${speakerName}。\n\n【第三輪・攻防深化】\n你的論點在第二輪被質疑了。請：\n1. 針對被質疑的部分做出具體回應（不能迴避）\n2. 如果你被說服了某些點，坦承修正你的立場 — 改變想法不是弱點，是思考能力的展現\n3. 在修正後的基礎上，深化你最核心的論點\n\n目標：讓你的論點更精準、更有力。`,

        4: `你是 ${speakerName}。\n\n【第四輪・核心收斂】\n經過三輪辯論，請做一次結構性的梳理：\n1. 列出目前三方的共識（哪些點大家其實是同意的？）\n2. 列出真正的核心分歧（哪些是根本性的不同意見？）\n3. 辨別假分歧（哪些爭論其實只是語義差異或角度不同？）\n4. 對核心分歧，說明你為什麼堅持你的立場 — 不要為了和諧而放棄你認為對的事\n\n目標：把辯論聚焦到真正重要的問題上。`,

        5: `你是 ${speakerName}。\n\n【最終輪・真理浮現】\n這是最後一輪。請給出你的最終結論：\n1. 經過四輪辯論，你的立場改變了多少？具體哪些觀點改變了你的想法？\n2. 你認為這個議題的「真理」在哪裡？（可以是多元的）\n3. 還有哪些問題是這場辯論沒能解決的？\n\n坦誠 > 正確。展現你的思考過程。`,
      };

      let prompt = `${roundInstructions[round]}\n\n議題：「${question}」`;

      if (history.length > 0) {
        const historyText = history
          .map((h) => `【第${h.round}輪・${h.name}】\n${h.text}`)
          .join('\n\n---\n\n');
        prompt += `\n\n── 以下是目前的辯論記錄 ──\n\n${historyText}`;
      }

      return prompt;
    },
  },
  coding: {
    // Step 1: Planner writes spec
    plannerSpec: (question: string) =>
      `你是軟體架構規劃師。請針對以下需求，寫出完整的實作計畫：\n1. 需求分析與邊界條件\n2. 技術選型與理由\n3. 檔案結構\n4. 每個模組的職責與介面定義\n5. 關鍵演算法的偽代碼\n6. 可能的 edge cases\n\n計畫要完整到「不需要再問問題就能直接寫 code」。\n\n需求：${question}`,

    // Step 2: Reviewer reviews spec
    reviewerSpec: (question: string, spec: string, plannerName: string) =>
      `你是嚴格的技術審查者。${plannerName} 針對以下需求寫了一份實作計畫：\n\n需求：${question}\n\n計畫：\n${spec}\n\n請嚴格審查：\n1. 邏輯漏洞？\n2. 漏掉的 edge cases？\n3. 安全性問題？\n4. 架構設計是否合理？\n5. 有沒有更好的做法？\n\n不要當好人，你的工作就是挑毛病。同時也指出計畫中做得好的部分。`,

    // Step 3: Coder writes v1
    coderV1: (question: string, spec: string, plannerName: string, specReview: string, reviewerName: string) =>
      `你是資深工程師。請根據以下規格和審查意見，寫出第一版完整實作代碼。\n\n需求：${question}\n\n${plannerName} 的規格：\n${spec}\n\n${reviewerName} 的審查意見：\n${specReview}\n\n要求：\n1. 處理審查中提到的所有問題\n2. 補上錯誤處理和 edge cases\n3. 如果規格和審查有矛盾，用你的專業判斷選擇\n\n這是第一版，後面還有 code review 機會，所以先完成核心功能。`,

    // Step 4: Reviewer reviews code
    reviewerCode: (question: string, code: string, coderName: string) =>
      `你是嚴格的 Code Reviewer。${coderName} 根據規格寫了第一版代碼。\n\n原始需求：${question}\n\n${coderName} 的代碼（v1）：\n${code}\n\n請做完整的 code review：\n1. 有沒有 bug 或邏輯錯誤？\n2. 有沒有漏掉的 edge cases？\n3. 程式碼品質：命名、結構、可讀性\n4. 效能問題？\n5. 安全性問題？\n6. 測試覆蓋建議\n\n列出每個問題的嚴重程度（Critical / Major / Minor）和具體修正建議。`,

    // Step 5: Coder fixes → v2
    coderV2: (question: string, codeV1: string, codeReview: string, reviewerName: string) =>
      `你是資深工程師。${reviewerName} 對你的第一版代碼做了 code review。\n\n原始需求：${question}\n\n你的 v1 代碼：\n${codeV1}\n\n${reviewerName} 的 code review：\n${codeReview}\n\n請根據 review 意見修正代碼，產出 v2。要求：\n1. 處理所有 Critical 和 Major 問題\n2. Minor 問題視情況處理\n3. 在修改處加上簡短註解說明為什麼改\n4. 如果你不同意某個 review 意見，說明理由\n\n輸出完整的 v2 代碼。`,

    // Step 6: Planner does acceptance
    plannerAcceptance: (question: string, codeV2: string, coderName: string, originalSpec: string) =>
      `你是軟體架構規劃師，同時也是這個需求的提出者。${coderName} 已經根據你的規格和 code review 修正了代碼。\n\n原始需求：${question}\n\n你當初的規格：\n${originalSpec}\n\n${coderName} 的 v2 代碼：\n${codeV2}\n\n請做驗收測試：\n1. v2 是否完整實現了原始需求的每一個功能點？\n2. 是否符合你的架構設計？\n3. 有沒有偏離規格的地方？\n4. 還有什麼需要調整的？\n\n如果都通過，明確說「驗收通過」。如果有問題，列出需要修正的項目。`,

    // Step 7: Coder final fix
    coderFinal: (question: string, codeV2: string, acceptance: string, plannerName: string) =>
      `你是資深工程師。${plannerName} 對你的 v2 代碼做了驗收測試。\n\n原始需求：${question}\n\n你的 v2 代碼：\n${codeV2}\n\n${plannerName} 的驗收結果：\n${acceptance}\n\n如果驗收通過，輸出最終版代碼（可做最後的 polish）。\n如果有需要修正的項目，處理後輸出最終版。\n\n這是最終版，請確保：\n1. 所有驗收意見已處理\n2. 代碼可以直接使用\n3. 必要的文件或使用說明已包含`,
  },
};

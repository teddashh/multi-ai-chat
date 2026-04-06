type Locale = 'en' | 'zh-TW' | 'ja' | 'ko';

function detectLocale(): Locale {
  const lang = navigator.language || 'en';
  if (lang.startsWith('zh')) return 'zh-TW';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  return 'en';
}

const currentLocale = detectLocale();

const messages: Record<Locale, Record<string, string>> = {
  'en': {
    // Header
    'app.title': 'Multi-AI Chat',
    'app.connected': 'connected',
    'app.export': 'Export',

    // Modes
    'mode.free': 'Free Mode',
    'mode.free.desc': 'Send to all AIs in parallel',
    'mode.debate': 'Debate',
    'mode.debate.desc': 'Pro → Con → Summary',
    'mode.consult': 'Consult',
    'mode.consult.desc': 'First → Review → Summary',
    'mode.coding': 'Coding',
    'mode.coding.desc': 'Plan → Review → Code (7 steps)',
    'mode.roundtable': 'Roundtable',
    'mode.roundtable.desc': '5-round dialectical spiral debate',

    // Role config
    'roles.toggle.show': '▼ Role Settings',
    'roles.toggle.hide': '▲ Hide Role Settings',

    // Roles - Debate
    'role.pro': 'Pro',
    'role.con': 'Con',
    'role.summary': 'Summary',

    // Roles - Consult
    'role.first': 'First',
    'role.reviewer': 'Reviewer',

    // Roles - Coding
    'role.planner': 'Planner',
    'role.coder': 'Coder',

    // Roles - Roundtable
    'role.first_speaker': '1st',
    'role.second_speaker': '2nd',
    'role.third_speaker': '3rd',

    // Chat
    'chat.empty': 'Connect AIs to start chatting',
    'chat.mode': 'Current mode',

    // Input
    'input.placeholder': 'Type a message...',
    'input.placeholder.processing': 'Processing...',
    'input.placeholder.connect': 'Connect an AI first',
    'input.stop': 'Stop',
    'input.send': 'Send',
  },
  'zh-TW': {
    'app.title': 'Multi-AI Chat',
    'app.connected': '已連線',
    'app.export': '匯出',

    'mode.free': '自由模式',
    'mode.free.desc': '同時發給三家，各自獨立回答',
    'mode.debate': '三方辯證',
    'mode.debate.desc': '正方 → 反方反駁 → 總結綜合',
    'mode.consult': '多方諮詢',
    'mode.consult.desc': '先答 → 審查補充 → 總結研究',
    'mode.coding': 'Coding 模式',
    'mode.coding.desc': '規劃 → 審查 → 實作（7 步）',
    'mode.roundtable': '道理辯證',
    'mode.roundtable.desc': '5 輪辯證螺旋，真理越辯越明',

    'roles.toggle.show': '▼ 角色設定',
    'roles.toggle.hide': '▲ 收起角色設定',

    'role.pro': '正方',
    'role.con': '反方',
    'role.summary': '總結',
    'role.first': '先答',
    'role.reviewer': '審查',
    'role.planner': '規劃',
    'role.coder': 'Coder/QC',
    'role.first_speaker': '第一位',
    'role.second_speaker': '第二位',
    'role.third_speaker': '第三位',

    'chat.empty': '連線 AI 後開始對話',
    'chat.mode': '目前模式',

    'input.placeholder': '輸入訊息... (Enter 送出, Shift+Enter 換行)',
    'input.placeholder.processing': '處理中...',
    'input.placeholder.connect': '請先連線 AI',
    'input.stop': 'Stop',
    'input.send': '送出',
  },
  'ja': {
    'app.title': 'Multi-AI Chat',
    'app.connected': '接続中',
    'app.export': 'エクスポート',

    'mode.free': 'フリーモード',
    'mode.free.desc': '3つのAIに同時送信',
    'mode.debate': '三者討論',
    'mode.debate.desc': '賛成 → 反対 → まとめ',
    'mode.consult': 'コンサルト',
    'mode.consult.desc': '回答 → レビュー → まとめ',
    'mode.coding': 'コーディング',
    'mode.coding.desc': '設計 → レビュー → 実装（7ステップ）',
    'mode.roundtable': '円卓討論',
    'mode.roundtable.desc': '5ラウンドの弁証法スパイラル',

    'roles.toggle.show': '▼ 役割設定',
    'roles.toggle.hide': '▲ 役割設定を閉じる',

    'role.pro': '賛成',
    'role.con': '反対',
    'role.summary': 'まとめ',
    'role.first': '最初',
    'role.reviewer': 'レビュアー',
    'role.planner': '設計者',
    'role.coder': 'コーダー',
    'role.first_speaker': '1番目',
    'role.second_speaker': '2番目',
    'role.third_speaker': '3番目',

    'chat.empty': 'AIに接続して会話を始めましょう',
    'chat.mode': '現在のモード',

    'input.placeholder': 'メッセージを入力... (Enter で送信, Shift+Enter で改行)',
    'input.placeholder.processing': '処理中...',
    'input.placeholder.connect': 'まずAIに接続してください',
    'input.stop': '停止',
    'input.send': '送信',
  },
  'ko': {
    'app.title': 'Multi-AI Chat',
    'app.connected': '연결됨',
    'app.export': '내보내기',

    'mode.free': '자유 모드',
    'mode.free.desc': '3개의 AI에 동시 전송',
    'mode.debate': '삼자 토론',
    'mode.debate.desc': '찬성 → 반대 → 종합',
    'mode.consult': '다자 자문',
    'mode.consult.desc': '답변 → 검토 → 종합',
    'mode.coding': '코딩 모드',
    'mode.coding.desc': '설계 → 검토 → 구현 (7단계)',
    'mode.roundtable': '원탁 토론',
    'mode.roundtable.desc': '5라운드 변증법 스파이럴',

    'roles.toggle.show': '▼ 역할 설정',
    'roles.toggle.hide': '▲ 역할 설정 닫기',

    'role.pro': '찬성',
    'role.con': '반대',
    'role.summary': '종합',
    'role.first': '선답',
    'role.reviewer': '검토자',
    'role.planner': '설계자',
    'role.coder': '코더',
    'role.first_speaker': '1번째',
    'role.second_speaker': '2번째',
    'role.third_speaker': '3번째',

    'chat.empty': 'AI를 연결하여 대화를 시작하세요',
    'chat.mode': '현재 모드',

    'input.placeholder': '메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)',
    'input.placeholder.processing': '처리 중...',
    'input.placeholder.connect': '먼저 AI를 연결하세요',
    'input.stop': '중지',
    'input.send': '전송',
  },
};

export function t(key: string): string {
  return messages[currentLocale]?.[key] ?? messages['en'][key] ?? key;
}

export function getLocale(): Locale {
  return currentLocale;
}

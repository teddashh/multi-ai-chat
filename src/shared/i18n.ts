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
    'app.publish': 'Publish',
    'app.settings': 'Settings',

    // Settings
    'settings.title': 'Settings',
    'settings.hackmd.label': 'HackMD API Token',
    'settings.hackmd.help': 'Get your token at',
    'settings.hackmd.local': 'Stored locally in your browser. Never sent anywhere except HackMD.',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.clear': 'Clear token',

    // Publish
    'publish.empty': 'Nothing to publish yet.',
    'publish.no_token': 'Set your HackMD API token in Settings first.',
    'publish.publishing': 'Publishing to HackMD...',
    'publish.success': 'Published! URL copied to clipboard:',
    'publish.failed': 'Publish failed:',

    // Modes
    'mode.free': 'Free Mode',
    'mode.free.desc': 'Send to all 4 AIs in parallel',
    'mode.debate': 'Debate',
    'mode.debate.desc': 'Pro → Con → Judge → Summary',
    'mode.consult': 'Consult',
    'mode.consult.desc': 'Two Answers → Review → Summary',
    'mode.coding': 'Coding',
    'mode.coding.desc': 'Plan → Review → Code → Test (8 steps)',
    'mode.roundtable': 'Roundtable',
    'mode.roundtable.desc': '5-round dialectical spiral × 4 AIs',

    // Role config
    'roles.toggle.show': '▼ Role Settings',
    'roles.toggle.hide': '▲ Hide Role Settings',

    // Roles - Debate
    'role.pro': 'Pro',
    'role.con': 'Con',
    'role.judge': 'Judge',
    'role.summary': 'Summary',

    // Roles - Consult
    'role.first': 'Answer A',
    'role.second': 'Answer B',
    'role.reviewer': 'Reviewer',

    // Roles - Coding
    'role.planner': 'Planner',
    'role.coder': 'Coder',
    'role.tester': 'Tester',

    // Roles - Roundtable
    'role.first_speaker': '1st',
    'role.second_speaker': '2nd',
    'role.third_speaker': '3rd',
    'role.fourth_speaker': '4th',

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
    'app.publish': '發佈',
    'app.settings': '設定',

    'settings.title': '設定',
    'settings.hackmd.label': 'HackMD API Token',
    'settings.hackmd.help': '到這裡取得 token：',
    'settings.hackmd.local': '只存在你的瀏覽器，除了 HackMD 之外不會送到任何地方。',
    'settings.save': '儲存',
    'settings.cancel': '取消',
    'settings.clear': '清除 token',

    'publish.empty': '還沒有可發佈的內容。',
    'publish.no_token': '請先到設定填入 HackMD API Token。',
    'publish.publishing': '發佈到 HackMD 中...',
    'publish.success': '發佈成功！URL 已複製到剪貼簿：',
    'publish.failed': '發佈失敗：',

    'mode.free': '自由模式',
    'mode.free.desc': '同時發給四家，各自獨立回答',
    'mode.debate': '四方辯證',
    'mode.debate.desc': '正方 → 反方 → 判官 → 總結',
    'mode.consult': '多方諮詢',
    'mode.consult.desc': '雙源先答 → 審查 → 總結',
    'mode.coding': 'Coding 模式',
    'mode.coding.desc': '規劃 → 審查 → 實作 → 測試（8 步）',
    'mode.roundtable': '道理辯證',
    'mode.roundtable.desc': '5 輪辯證螺旋 × 4 人',

    'roles.toggle.show': '▼ 角色設定',
    'roles.toggle.hide': '▲ 收起角色設定',

    'role.pro': '正方',
    'role.con': '反方',
    'role.judge': '判官',
    'role.summary': '總結',
    'role.first': '先答 A',
    'role.second': '先答 B',
    'role.reviewer': '審查',
    'role.planner': '規劃',
    'role.coder': 'Coder/QC',
    'role.tester': 'Tester',
    'role.first_speaker': '第一位',
    'role.second_speaker': '第二位',
    'role.third_speaker': '第三位',
    'role.fourth_speaker': '第四位',

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
    'app.publish': '公開',
    'app.settings': '設定',

    'settings.title': '設定',
    'settings.hackmd.label': 'HackMD API トークン',
    'settings.hackmd.help': 'トークン取得：',
    'settings.hackmd.local': 'ブラウザ内にのみ保存され、HackMD 以外には送信されません。',
    'settings.save': '保存',
    'settings.cancel': 'キャンセル',
    'settings.clear': 'トークンを削除',

    'publish.empty': '公開する内容がありません。',
    'publish.no_token': '先に設定で HackMD API トークンを入力してください。',
    'publish.publishing': 'HackMD に公開中...',
    'publish.success': '公開しました！URL をクリップボードにコピー：',
    'publish.failed': '公開失敗：',

    'mode.free': 'フリーモード',
    'mode.free.desc': '4つのAIに同時送信',
    'mode.debate': '四者討論',
    'mode.debate.desc': '賛成 → 反対 → 判定 → まとめ',
    'mode.consult': 'コンサルト',
    'mode.consult.desc': '2人回答 → レビュー → まとめ',
    'mode.coding': 'コーディング',
    'mode.coding.desc': '設計 → レビュー → 実装 → テスト（8ステップ）',
    'mode.roundtable': '円卓討論',
    'mode.roundtable.desc': '5ラウンド弁証法 × 4人',

    'roles.toggle.show': '▼ 役割設定',
    'roles.toggle.hide': '▲ 役割設定を閉じる',

    'role.pro': '賛成',
    'role.con': '反対',
    'role.judge': '判定',
    'role.summary': 'まとめ',
    'role.first': '回答 A',
    'role.second': '回答 B',
    'role.reviewer': 'レビュアー',
    'role.planner': '設計者',
    'role.coder': 'コーダー',
    'role.tester': 'テスター',
    'role.first_speaker': '1番目',
    'role.second_speaker': '2番目',
    'role.third_speaker': '3番目',
    'role.fourth_speaker': '4番目',

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
    'app.publish': '게시',
    'app.settings': '설정',

    'settings.title': '설정',
    'settings.hackmd.label': 'HackMD API 토큰',
    'settings.hackmd.help': '토큰 받기:',
    'settings.hackmd.local': '브라우저에만 저장되며 HackMD 외에는 전송되지 않습니다.',
    'settings.save': '저장',
    'settings.cancel': '취소',
    'settings.clear': '토큰 삭제',

    'publish.empty': '게시할 내용이 없습니다.',
    'publish.no_token': '먼저 설정에서 HackMD API 토큰을 입력하세요.',
    'publish.publishing': 'HackMD에 게시 중...',
    'publish.success': '게시 완료! URL이 클립보드에 복사됨:',
    'publish.failed': '게시 실패:',

    'mode.free': '자유 모드',
    'mode.free.desc': '4개의 AI에 동시 전송',
    'mode.debate': '사자 토론',
    'mode.debate.desc': '찬성 → 반대 → 판정 → 종합',
    'mode.consult': '다자 자문',
    'mode.consult.desc': '2인 답변 → 검토 → 종합',
    'mode.coding': '코딩 모드',
    'mode.coding.desc': '설계 → 검토 → 구현 → 테스트 (8단계)',
    'mode.roundtable': '원탁 토론',
    'mode.roundtable.desc': '5라운드 변증법 × 4인',

    'roles.toggle.show': '▼ 역할 설정',
    'roles.toggle.hide': '▲ 역할 설정 닫기',

    'role.pro': '찬성',
    'role.con': '반대',
    'role.judge': '판정',
    'role.summary': '종합',
    'role.first': '답변 A',
    'role.second': '답변 B',
    'role.reviewer': '검토자',
    'role.planner': '설계자',
    'role.coder': '코더',
    'role.tester': '테스터',
    'role.first_speaker': '1번째',
    'role.second_speaker': '2번째',
    'role.third_speaker': '3번째',
    'role.fourth_speaker': '4번째',

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

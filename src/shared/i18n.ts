import type { Locale } from './types';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'zh-TW', 'ja', 'de', 'ko'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  ja: '日本語',
  de: 'Deutsch',
  ko: '한국어',
};

function detectLocale(): Locale {
  const language = navigator.language || 'en';
  if (language.startsWith('zh')) return 'zh-TW';
  if (language.startsWith('ja')) return 'ja';
  if (language.startsWith('de')) return 'de';
  if (language.startsWith('ko')) return 'ko';
  return 'en';
}

let currentLocale: Locale = detectLocale();

const en: Record<string, string> = {
  'app.title': 'Multi-AI Chat',
  'app.subtitle': 'One question, four perspectives',
  'app.connected': 'ready',
  'app.export': 'Export',
  'app.publish': 'Publish',
  'app.settings': 'Settings',
  'app.menu': 'Conversations',
  'app.new': 'New chat',
  'app.close': 'Close',
  'session.history': 'Conversation history',
  'session.empty': 'No saved conversations yet',
  'session.untitled': 'New conversation',
  'session.delete': 'Delete',
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.hackmd.label': 'HackMD API token',
  'settings.hackmd.help': 'Optional. Create a token at',
  'settings.hackmd.local': 'Stored only in trusted extension pages. Publishing creates a guest-readable HackMD note.',
  'settings.about': 'About',
  'settings.sponsored': 'Sponsored by AI-Sister.com',
  'settings.author': 'Ted Huang · TED@TED-H.com',
  'settings.website': 'ted-h.com',
  'settings.save': 'Save',
  'settings.cancel': 'Cancel',
  'settings.clear': 'Clear token',
  'publish.empty': 'Nothing to publish yet.',
  'publish.no_token': 'Set your HackMD API token in Settings first.',
  'publish.publishing': 'Publishing…',
  'publish.success': 'Published. URL copied to the clipboard:',
  'publish.failed': 'Publish failed:',
  'mode.free': 'Free',
  'mode.free.desc': 'Ask every selected AI in parallel. Best for quick comparison.',
  'mode.debate': 'Debate',
  'mode.debate.desc': 'Pro → Con → Judge → Summary. Best for testing an argument.',
  'mode.consult': 'Consult',
  'mode.consult.desc': 'Two independent answers → Review → Summary. Best for research.',
  'mode.coding': 'Coding',
  'mode.coding.desc': 'Plan → Review → Implement → Test → Accept in eight steps.',
  'mode.roundtable': 'Roundtable',
  'mode.roundtable.desc': 'Four AIs debate for five rounds and progressively converge.',
  'mode.details': 'How this mode works',
  'roles.toggle.show': 'Customize roles',
  'roles.toggle.hide': 'Hide roles',
  'role.pro': 'Pro',
  'role.con': 'Con',
  'role.judge': 'Judge',
  'role.summary': 'Summary',
  'role.first': 'Answer A',
  'role.second': 'Answer B',
  'role.reviewer': 'Reviewer',
  'role.planner': 'Planner',
  'role.coder': 'Coder',
  'role.tester': 'Tester',
  'role.first_speaker': 'Speaker 1',
  'role.second_speaker': 'Speaker 2',
  'role.third_speaker': 'Speaker 3',
  'role.fourth_speaker': 'Speaker 4',
  'connection.title': 'AI connections',
  'connection.help': 'Open or sign in to each provider tab once. Selected tabs stay under your control.',
  'connection.connected': 'Ready',
  'connection.checking': 'Checking',
  'connection.login': 'Sign in',
  'connection.open': 'Open',
  'connection.connect_all': 'Connect all',
  'targets.title': 'Send to',
  'trace.title': 'Workflow',
  'trace.idle': 'Ready for your next question',
  'chat.empty': 'Start with one question',
  'chat.empty.help': 'Choose a mode, verify the providers you need, then send. You can continue in the same conversation afterward.',
  'chat.typing': 'responding…',
  'chat.you': 'You',
  'chat.system': 'System',
  'input.placeholder': 'Ask the selected AIs…',
  'input.placeholder.processing': 'Workflow is running…',
  'input.placeholder.connect': 'Open the AI providers required by this mode',
  'input.stop': 'Stop',
  'input.send': 'Send',
  'workflow.starting': 'Starting workflow…',
  'workflow.interrupted': 'Previous workflow was interrupted by the browser…',
  'workflow.free': '{providers} are answering in parallel…',
  'workflow.debate.pro': '{provider} is presenting the pro case…',
  'workflow.debate.con': '{provider} is challenging the argument…',
  'workflow.debate.judge': '{provider} is judging both sides…',
  'workflow.debate.summary': '{provider} is writing the synthesis…',
  'workflow.consult.initial': '{first} and {second} are answering independently…',
  'workflow.consult.review': '{provider} is reviewing both answers…',
  'workflow.consult.summary': '{provider} is preparing the final answer…',
  'workflow.coding': 'Step {current}/8 · {provider} · {action}',
  'workflow.roundtable': 'Round {round}/5 · {label} · {provider}',
  'workflow.cancelled': 'Workflow stopped',
  'coding.spec': 'writing the specification',
  'coding.specReview': 'reviewing the specification',
  'coding.codeV1': 'implementing v1',
  'coding.codeReview': 'reviewing the code',
  'coding.test': 'designing tests',
  'coding.codeV2': 'fixing v2',
  'coding.acceptance': 'checking acceptance',
  'coding.final': 'preparing the final version',
  'round.1': 'Opening positions',
  'round.2': 'Cross-examination',
  'round.3': 'Deeper defense',
  'round.4': 'Convergence',
  'round.5': 'Final synthesis',
};

const zh: Record<string, string> = {
  ...en,
  'app.subtitle': '一個問題，四種觀點', 'app.connected': '就緒', 'app.export': '匯出', 'app.publish': '發佈', 'app.settings': '設定', 'app.menu': '對話記錄', 'app.new': '新對話', 'app.close': '關閉',
  'session.history': '對話記錄', 'session.empty': '還沒有儲存的對話', 'session.untitled': '新對話', 'session.delete': '刪除',
  'settings.title': '設定', 'settings.language': '語言', 'settings.hackmd.label': 'HackMD API Token', 'settings.hackmd.help': '選填，可在這裡建立 Token：', 'settings.hackmd.local': '只儲存在受信任的外掛頁面。發佈會建立訪客可讀的 HackMD 筆記。', 'settings.about': '作者資訊', 'settings.sponsored': 'Sponsored by AI-Sister.com', 'settings.author': 'Ted Huang · TED@TED-H.com', 'settings.website': 'ted-h.com', 'settings.save': '儲存', 'settings.cancel': '取消', 'settings.clear': '清除 Token',
  'publish.empty': '還沒有可發佈的內容。', 'publish.no_token': '請先在設定填入 HackMD API Token。', 'publish.publishing': '發佈中…', 'publish.success': '發佈成功，網址已複製：', 'publish.failed': '發佈失敗：',
  'mode.free': '自由分送', 'mode.free.desc': '同時詢問所有勾選的 AI，最適合快速比較。', 'mode.debate': '四方辯證', 'mode.debate.desc': '正方 → 反方 → 判官 → 總結，適合檢驗論點。', 'mode.consult': '多方諮詢', 'mode.consult.desc': '兩份獨立回答 → 審查 → 總結，適合研究。', 'mode.coding': 'Coding', 'mode.coding.desc': '規劃、審查、實作、測試與驗收，共八步。', 'mode.roundtable': '道理辯證', 'mode.roundtable.desc': '四家 AI 進行五輪辯證並逐步收斂。', 'mode.details': '模式說明',
  'roles.toggle.show': '自訂角色', 'roles.toggle.hide': '收起角色', 'role.pro': '正方', 'role.con': '反方', 'role.judge': '判官', 'role.summary': '總結', 'role.first': '先答 A', 'role.second': '先答 B', 'role.reviewer': '審查', 'role.planner': '規劃', 'role.coder': '實作', 'role.tester': '測試', 'role.first_speaker': '第一位', 'role.second_speaker': '第二位', 'role.third_speaker': '第三位', 'role.fourth_speaker': '第四位',
  'connection.title': 'AI 連線', 'connection.help': '每家服務只要開啟或登入一次；外掛會持續使用你選定的真實分頁。', 'connection.connected': '就緒', 'connection.checking': '檢查中', 'connection.login': '請登入', 'connection.open': '開啟', 'connection.connect_all': '全部連線', 'targets.title': '傳送給',
  'trace.title': '執行流程', 'trace.idle': '可以開始下一個問題', 'chat.empty': '先問一個問題', 'chat.empty.help': '選模式、確認需要的 AI 後送出；流程結束後可以直接接著聊。', 'chat.typing': '回答中…', 'chat.you': '你', 'chat.system': '系統',
  'input.placeholder': '詢問已選取的 AI…', 'input.placeholder.processing': '流程執行中…', 'input.placeholder.connect': '請先開啟此模式需要的 AI', 'input.stop': '停止', 'input.send': '送出',
  'workflow.starting': '正在啟動流程…',
  'workflow.interrupted': '上一個流程被瀏覽器中斷…',
  'workflow.free': '{providers} 同時作答中…', 'workflow.debate.pro': '{provider} 正方立論中…', 'workflow.debate.con': '{provider} 反方反駁中…', 'workflow.debate.judge': '{provider} 評析雙方中…', 'workflow.debate.summary': '{provider} 綜合結論中…', 'workflow.consult.initial': '{first} 與 {second} 獨立回答中…', 'workflow.consult.review': '{provider} 審查兩份回答中…', 'workflow.consult.summary': '{provider} 整理最終答案中…', 'workflow.coding': '第 {current}/8 步 · {provider} · {action}', 'workflow.roundtable': '第 {round}/5 輪 · {label} · {provider}', 'workflow.cancelled': '流程已停止',
  'coding.spec': '撰寫規格', 'coding.specReview': '審查規格', 'coding.codeV1': '實作 v1', 'coding.codeReview': '程式碼審查', 'coding.test': '設計測試', 'coding.codeV2': '修正 v2', 'coding.acceptance': '驗收', 'coding.final': '整理最終版',
  'round.1': '開場立論', 'round.2': '交叉質疑', 'round.3': '攻防深化', 'round.4': '核心收斂', 'round.5': '真理浮現',
};

const ja: Record<string, string> = {
  ...en,
  'app.subtitle': '1つの質問、4つの視点', 'app.connected': '準備完了', 'app.export': '書き出し', 'app.publish': '公開', 'app.settings': '設定', 'app.menu': '会話履歴', 'app.new': '新しい会話', 'app.close': '閉じる', 'session.history': '会話履歴', 'session.empty': '保存された会話はありません', 'session.untitled': '新しい会話',
  'settings.title': '設定', 'settings.language': '言語', 'settings.hackmd.help': '任意。トークンの作成：', 'settings.hackmd.local': '信頼された拡張機能ページだけに保存されます。公開するとゲスト閲覧可能な HackMD ノートになります。', 'settings.about': '情報', 'settings.save': '保存', 'settings.cancel': 'キャンセル', 'settings.clear': 'トークンを削除',
  'publish.empty': '公開する内容がありません。', 'publish.no_token': '先に設定で HackMD API トークンを入力してください。', 'publish.publishing': '公開中…', 'publish.success': '公開しました。URLをコピーしました：', 'publish.failed': '公開失敗：',
  'mode.free': '自由送信', 'mode.free.desc': '選択したAIへ同時送信し、素早く比較します。', 'mode.debate': '四者討論', 'mode.debate.desc': '賛成 → 反対 → 判定 → まとめ。主張の検証向け。', 'mode.consult': '多角相談', 'mode.consult.desc': '独立回答2件 → レビュー → まとめ。調査向け。', 'mode.coding': 'Coding', 'mode.coding.desc': '計画、レビュー、実装、テスト、受入を8段階で実行。', 'mode.roundtable': '円卓討論', 'mode.roundtable.desc': '4つのAIが5ラウンド議論して収束します。', 'mode.details': 'モードの説明',
  'roles.toggle.show': '役割を変更', 'roles.toggle.hide': '役割を閉じる', 'role.pro': '賛成', 'role.con': '反対', 'role.judge': '判定', 'role.summary': 'まとめ', 'role.first': '回答 A', 'role.second': '回答 B', 'role.reviewer': 'レビュー', 'role.planner': '設計', 'role.coder': '実装', 'role.tester': 'テスト', 'role.first_speaker': '1番目', 'role.second_speaker': '2番目', 'role.third_speaker': '3番目', 'role.fourth_speaker': '4番目', 'connection.title': 'AI 接続', 'connection.help': '各サービスを一度開くかログインしてください。選択した実タブを操作します。', 'connection.connected': '準備完了', 'connection.checking': '確認中', 'connection.login': 'ログイン', 'connection.open': '開く', 'targets.title': '送信先', 'trace.title': 'ワークフロー', 'trace.idle': '次の質問を入力できます', 'chat.empty': '質問から始めましょう', 'chat.empty.help': 'モードとAIを確認して送信します。完了後も同じ会話を続けられます。', 'chat.typing': '回答中…', 'chat.you': 'あなた', 'chat.system': 'システム',
  'input.placeholder': '選択したAIに質問…', 'input.placeholder.processing': '実行中…', 'input.placeholder.connect': 'このモードに必要なAIを開いてください', 'input.stop': '停止', 'input.send': '送信',
  'workflow.starting': 'ワークフローを開始中…',
  'workflow.interrupted': '前回のワークフローがブラウザにより中断されました…',
  'workflow.free': '{providers} が同時に回答中…', 'workflow.debate.pro': '{provider} が賛成立論中…', 'workflow.debate.con': '{provider} が反論中…', 'workflow.debate.judge': '{provider} が判定中…', 'workflow.debate.summary': '{provider} がまとめ中…', 'workflow.consult.initial': '{first} と {second} が独立回答中…', 'workflow.consult.review': '{provider} がレビュー中…', 'workflow.consult.summary': '{provider} が最終回答を作成中…', 'workflow.coding': 'ステップ {current}/8 · {provider} · {action}', 'workflow.roundtable': 'ラウンド {round}/5 · {label} · {provider}', 'workflow.cancelled': '停止しました',
  'coding.spec': '仕様を作成', 'coding.specReview': '仕様をレビュー', 'coding.codeV1': 'v1を実装', 'coding.codeReview': 'コードレビュー', 'coding.test': 'テストを設計', 'coding.codeV2': 'v2を修正', 'coding.acceptance': '受入確認', 'coding.final': '最終版を作成', 'round.1': '開場立論', 'round.2': '相互質問', 'round.3': '議論深化', 'round.4': '収束', 'round.5': '最終統合',
};

const de: Record<string, string> = {
  ...en,
  'app.subtitle': 'Eine Frage, vier Perspektiven', 'app.connected': 'bereit', 'app.export': 'Exportieren', 'app.publish': 'Veröffentlichen', 'app.settings': 'Einstellungen', 'app.menu': 'Unterhaltungen', 'app.new': 'Neuer Chat', 'app.close': 'Schließen', 'session.history': 'Gesprächsverlauf', 'session.empty': 'Noch keine gespeicherten Gespräche', 'session.untitled': 'Neues Gespräch',
  'settings.title': 'Einstellungen', 'settings.language': 'Sprache', 'settings.hackmd.help': 'Optional. Token erstellen unter', 'settings.hackmd.local': 'Nur in vertrauenswürdigen Erweiterungsseiten gespeichert. Beim Veröffentlichen entsteht eine für Gäste lesbare HackMD-Notiz.', 'settings.about': 'Über', 'settings.save': 'Speichern', 'settings.cancel': 'Abbrechen', 'settings.clear': 'Token löschen',
  'publish.empty': 'Noch nichts zum Veröffentlichen.', 'publish.no_token': 'Zuerst einen HackMD-API-Token in den Einstellungen eintragen.', 'publish.publishing': 'Wird veröffentlicht…', 'publish.success': 'Veröffentlicht. URL wurde kopiert:', 'publish.failed': 'Veröffentlichung fehlgeschlagen:',
  'mode.free': 'Frei', 'mode.free.desc': 'Alle ausgewählten KIs parallel fragen und schnell vergleichen.', 'mode.debate': 'Debatte', 'mode.debate.desc': 'Pro → Contra → Urteil → Zusammenfassung.', 'mode.consult': 'Beratung', 'mode.consult.desc': 'Zwei unabhängige Antworten → Prüfung → Ergebnis.', 'mode.coding': 'Coding', 'mode.coding.desc': 'Planung, Review, Umsetzung, Test und Abnahme in acht Schritten.', 'mode.roundtable': 'Rundtisch', 'mode.roundtable.desc': 'Vier KIs diskutieren fünf Runden und nähern sich einem Ergebnis.', 'mode.details': 'So funktioniert der Modus',
  'roles.toggle.show': 'Rollen anpassen', 'roles.toggle.hide': 'Rollen schließen', 'role.pro': 'Pro', 'role.con': 'Contra', 'role.judge': 'Urteil', 'role.summary': 'Zusammenfassung', 'role.first': 'Antwort A', 'role.second': 'Antwort B', 'role.reviewer': 'Prüfung', 'role.planner': 'Planung', 'role.coder': 'Umsetzung', 'role.tester': 'Test', 'role.first_speaker': 'Sprecher 1', 'role.second_speaker': 'Sprecher 2', 'role.third_speaker': 'Sprecher 3', 'role.fourth_speaker': 'Sprecher 4', 'connection.title': 'KI-Verbindungen', 'connection.help': 'Jeden Dienst einmal öffnen oder anmelden. Die Erweiterung steuert die ausgewählten echten Tabs.', 'connection.connected': 'Bereit', 'connection.checking': 'Prüfung', 'connection.login': 'Anmelden', 'connection.open': 'Öffnen', 'targets.title': 'Senden an', 'trace.title': 'Ablauf', 'trace.idle': 'Bereit für die nächste Frage', 'chat.empty': 'Mit einer Frage beginnen', 'chat.empty.help': 'Modus und KIs wählen und senden. Danach kann das Gespräch fortgesetzt werden.', 'chat.typing': 'antwortet…', 'chat.you': 'Du', 'chat.system': 'System',
  'input.placeholder': 'Ausgewählte KIs fragen…', 'input.placeholder.processing': 'Workflow läuft…', 'input.placeholder.connect': 'Die für diesen Modus benötigten KIs öffnen', 'input.stop': 'Stopp', 'input.send': 'Senden',
  'workflow.starting': 'Workflow wird gestartet…',
  'workflow.interrupted': 'Der vorherige Workflow wurde vom Browser unterbrochen…',
  'workflow.free': '{providers} antworten parallel…', 'workflow.debate.pro': '{provider} trägt die Pro-Seite vor…', 'workflow.debate.con': '{provider} widerspricht…', 'workflow.debate.judge': '{provider} bewertet beide Seiten…', 'workflow.debate.summary': '{provider} fasst zusammen…', 'workflow.consult.initial': '{first} und {second} antworten unabhängig…', 'workflow.consult.review': '{provider} prüft beide Antworten…', 'workflow.consult.summary': '{provider} erstellt das Endergebnis…', 'workflow.coding': 'Schritt {current}/8 · {provider} · {action}', 'workflow.roundtable': 'Runde {round}/5 · {label} · {provider}', 'workflow.cancelled': 'Workflow gestoppt',
  'coding.spec': 'Spezifikation erstellen', 'coding.specReview': 'Spezifikation prüfen', 'coding.codeV1': 'v1 implementieren', 'coding.codeReview': 'Code prüfen', 'coding.test': 'Tests entwerfen', 'coding.codeV2': 'v2 korrigieren', 'coding.acceptance': 'Abnahme prüfen', 'coding.final': 'Endversion erstellen', 'round.1': 'Eröffnungspositionen', 'round.2': 'Kreuzfragen', 'round.3': 'Vertiefung', 'round.4': 'Konvergenz', 'round.5': 'Synthese',
};

const ko: Record<string, string> = {
  ...en,
  'app.subtitle': '하나의 질문, 네 가지 관점', 'app.connected': '준비됨', 'app.export': '내보내기', 'app.publish': '게시', 'app.settings': '설정', 'app.menu': '대화 기록', 'app.new': '새 대화', 'app.close': '닫기', 'session.history': '대화 기록', 'session.empty': '저장된 대화가 없습니다', 'session.untitled': '새 대화',
  'settings.title': '설정', 'settings.language': '언어', 'settings.hackmd.help': '선택 사항. 토큰 만들기:', 'settings.hackmd.local': '신뢰된 확장 페이지에만 저장됩니다. 게시하면 게스트가 읽을 수 있는 HackMD 노트가 생성됩니다.', 'settings.about': '정보', 'settings.save': '저장', 'settings.cancel': '취소', 'settings.clear': '토큰 삭제',
  'publish.empty': '게시할 내용이 없습니다.', 'publish.no_token': '먼저 설정에서 HackMD API 토큰을 입력하세요.', 'publish.publishing': '게시 중…', 'publish.success': '게시했습니다. URL을 복사했습니다:', 'publish.failed': '게시 실패:',
  'mode.free': '자유 전송', 'mode.free.desc': '선택한 AI에 동시에 질문해 빠르게 비교합니다.', 'mode.debate': '사자 토론', 'mode.debate.desc': '찬성 → 반대 → 판정 → 종합.', 'mode.consult': '다자 자문', 'mode.consult.desc': '독립 답변 2개 → 검토 → 최종 답변.', 'mode.coding': 'Coding', 'mode.coding.desc': '계획, 검토, 구현, 테스트, 인수를 8단계로 진행합니다.', 'mode.roundtable': '원탁 토론', 'mode.roundtable.desc': '4개의 AI가 5라운드 토론하며 결론에 수렴합니다.', 'mode.details': '모드 설명',
  'roles.toggle.show': '역할 설정', 'roles.toggle.hide': '역할 닫기', 'role.pro': '찬성', 'role.con': '반대', 'role.judge': '판정', 'role.summary': '종합', 'role.first': '답변 A', 'role.second': '답변 B', 'role.reviewer': '검토', 'role.planner': '계획', 'role.coder': '구현', 'role.tester': '테스트', 'role.first_speaker': '첫 번째', 'role.second_speaker': '두 번째', 'role.third_speaker': '세 번째', 'role.fourth_speaker': '네 번째', 'connection.title': 'AI 연결', 'connection.help': '각 서비스를 한 번 열거나 로그인하세요. 선택한 실제 탭을 제어합니다.', 'connection.connected': '준비됨', 'connection.checking': '확인 중', 'connection.login': '로그인', 'connection.open': '열기', 'targets.title': '전송 대상', 'trace.title': '워크플로', 'trace.idle': '다음 질문을 입력할 수 있습니다', 'chat.empty': '질문으로 시작하세요', 'chat.empty.help': '모드와 AI를 확인한 뒤 보내세요. 완료 후에도 같은 대화를 계속할 수 있습니다.', 'chat.typing': '답변 중…', 'chat.you': '나', 'chat.system': '시스템',
  'input.placeholder': '선택한 AI에게 질문…', 'input.placeholder.processing': '워크플로 실행 중…', 'input.placeholder.connect': '이 모드에 필요한 AI를 열어 주세요', 'input.stop': '중지', 'input.send': '전송',
  'workflow.starting': '워크플로 시작 중…',
  'workflow.interrupted': '이전 워크플로가 브라우저에 의해 중단되었습니다…',
  'workflow.free': '{providers} 동시 답변 중…', 'workflow.debate.pro': '{provider} 찬성 논의 중…', 'workflow.debate.con': '{provider} 반론 중…', 'workflow.debate.judge': '{provider} 판정 중…', 'workflow.debate.summary': '{provider} 종합 중…', 'workflow.consult.initial': '{first}와 {second}가 독립 답변 중…', 'workflow.consult.review': '{provider} 검토 중…', 'workflow.consult.summary': '{provider} 최종 답변 작성 중…', 'workflow.coding': '{current}/8 단계 · {provider} · {action}', 'workflow.roundtable': '{round}/5 라운드 · {label} · {provider}', 'workflow.cancelled': '워크플로 중지됨',
  'coding.spec': '명세 작성', 'coding.specReview': '명세 검토', 'coding.codeV1': 'v1 구현', 'coding.codeReview': '코드 검토', 'coding.test': '테스트 설계', 'coding.codeV2': 'v2 수정', 'coding.acceptance': '인수 확인', 'coding.final': '최종 버전 작성', 'round.1': '개회사', 'round.2': '상호 질문', 'round.3': '심화 공방', 'round.4': '수렴', 'round.5': '최종 종합',
};

const messages: Record<Locale, Record<string, string>> = { en, 'zh-TW': zh, ja, de, ko };

export function setLocale(locale: Locale): void {
  currentLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>, locale = currentLocale): string {
  const template = messages[locale]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}

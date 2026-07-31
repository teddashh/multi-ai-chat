# Chrome Web Store — submission pack

Everything needed for the Developer Dashboard listing of **Multi-AI Chat** (v0.2.0).
Copy each block into the matching field. Items marked **[you]** can only be done by the
publishing Google account.

---

## 0. Before you upload — action items **[you]**

1. **Register a developer account** at https://chrome.google.com/webstore/devconsole — one-time **US$5** fee (Google account + card). New accounts may need identity verification (can take a few days).
2. **Host the privacy policy.** Publish `store/PRIVACY.md` somewhere public (e.g. `https://ted-h.com/multi-ai-chat/privacy`) and paste the URL into the dashboard. A privacy-policy URL is **required** because the extension reads page content.
3. **Upload the package** `multi-ai-chat-store-v0.2.0.zip` (see §6 to regenerate).
4. **Add screenshots** (see §5).
5. Fill the fields below, complete the **Privacy practices** tab (§4), then **Submit for review**.

---

## 1. Store listing

| Field | Value |
|---|---|
| **Item name** | `Multi-AI Chat` |
| **Summary** (≤132 chars) | `Run reliable multi-AI workflows across ChatGPT, Claude, Gemini, and Grok from one side panel.` |
| **Category** | `Productivity` (Workflow & Planning) |
| **Language** | English (listing can be localized later to zh-TW / ja / de / ko) |

### Detailed description

```
Multi-AI Chat turns the ChatGPT, Claude, Gemini, and Grok tabs you already use into one
multi-AI workflow — right inside Chrome's Side Panel. There are no model API keys and no
separate chat backend: it drives the provider pages you are already signed into.

WORKFLOWS
• Free — send one prompt to every selected provider in parallel and compare answers.
• Debate — Pro → Con → Judge → Synthesis.
• Consult — two independent answers → review → final answer.
• Coding — an eight-step plan/review/implement/test/accept pass.
• Roundtable — five rounds of structured debate that converge on an answer.

WHY IT'S RELIABLE
• Input selectors retry, rich editors are verified, and Enter is used as a checked fallback.
• Every request has an ID, so a late answer can never complete the wrong workflow.
• Stop really stops — it cancels waiters and asks each provider page to stop generating.
• A tab is shown "Ready" only after its composer confirms you are signed in.

ALSO
• Up to 30 conversations are stored locally, with a New chat action and follow-up after any run.
• Responses render as safe Markdown.
• Five UI languages: English, Traditional Chinese, Japanese, German, Korean.
• Optional one-click publish of a conversation to HackMD (using your own token).

PRIVACY
Your prompts travel directly to the provider pages you already use. There is no Multi-AI Chat
server, no analytics, and no model API credential. Settings, conversations, and the optional
HackMD token are stored locally in your browser. See the privacy policy for details.

NOTE
This extension automates third-party web interfaces. A provider redesign can temporarily break
selectors, and automated use may be governed by each provider's terms — use accounts and content
you are authorized to use. Known issue: on Microsoft Edge, Claude may not connect because the
browser can block the extension on claude.ai; use Google Chrome for Claude.
```

---

## 2. Single purpose

```
Multi-AI Chat provides one Chrome Side Panel that sends a single prompt to the user's
already-signed-in ChatGPT, Claude, Gemini, and Grok tabs and orchestrates multi-step
comparison workflows (free, debate, consult, coding, roundtable) across them.
```

---

## 3. Permission justifications

Paste each into the matching "reason" box on the **Privacy practices** tab.

| Permission | Justification |
|---|---|
| `sidePanel` | Renders the extension's entire UI (mode selection, connection status, transcript, input) in Chrome's Side Panel. |
| `tabs` | Locates and focuses the user's existing ChatGPT/Claude/Gemini/Grok tabs and detects when a provider tab loads, navigates, reloads, or closes, so the panel shows accurate connection status. Not used to read tab contents. |
| `scripting` | Re-injects the extension's own bundled content script into a provider tab when that tab predates the extension load or its content script was evicted (e.g. after the service worker restarts). No remote or dynamically fetched code is ever executed. |
| `storage` | Saves the user's own data locally: UI language, up to 30 recent conversations, and the optional HackMD token. Nothing is sent to the developer. |
| **Host access** to `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`, `grok.com` | The content script must run on these provider pages to type the prompt into the composer, press send, and read back the on-page response so it can be shown in the Side Panel and passed to the next workflow step. These are the only sites the extension automates. |
| Host access to `api.hackmd.io` | Contacted only when the user explicitly clicks Publish, to create a HackMD note from the current conversation using the user's own token. Never contacted otherwise. |
| **Remote code** | **No.** All code is packaged in the extension; nothing is fetched and executed at runtime. |

---

## 4. Privacy practices — data collection

Declare the following data types and reasons; leave every other type unchecked.

| Data type | Collected? | What / why |
|---|---|---|
| **Website content** | Yes | The prompt text and the provider's on-page response are read to run the workflow and show the transcript. Processed locally; only sent externally if the user clicks Publish (to their own HackMD). Never sent to the developer. |
| **Authentication information** | Yes | The optional HackMD API token the user pastes in Settings, stored locally and sent only to HackMD when publishing. |
| PII, health, financial, personal communications*, location, web history, user activity | No | Not collected. |

\* The stored conversations live only in the user's browser and are never transmitted to the developer; they are disclosed above under "Website content."

**Three required certifications — all true:**
- ☑ I do not sell or transfer user data to third parties outside the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to the item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending.

**Privacy policy URL:** _(paste the hosted URL of `store/PRIVACY.md`)_ **[you]**

---

## 5. Screenshots

- Chrome Web Store requires **1280×800** or **640×400** (≥1 screenshot; up to 5).
- `store/screenshot-1280x800.png` is generated from the repo's `screenshot.png` (letterboxed to fit). It is upload-valid but a purpose-shot 1280×800 capture of the Side Panel in action would look better — ideally one per mode (Free / Debate / Consult).
- Optional small promo tile: 440×280.

---

## 6. Build the upload package

The store wants a zip whose **root** contains `manifest.json`. Since `dist/` is the built,
load-unpacked extension, zip its contents:

```powershell
# from the repo root
Compress-Archive -Path dist\* -DestinationPath store\multi-ai-chat-store-v0.2.0.zip -Force
```

```sh
# or with the zip CLI
(cd dist && zip -r ../store/multi-ai-chat-store-v0.2.0.zip .)
```

Always run `npm run verify` first so `dist/` reflects the current source.

---

## 7. Localized listings (zh-TW / ja / de / ko)

The Web Store lets you add a localized **Summary** and **Detailed description** per language
(same screenshots). The item name stays `Multi-AI Chat` in every locale. Permission
justifications and the privacy tab are single (English) and are not localized.

### 繁體中文 (zh-TW)

**Summary (≤132):** `用一個 Side Panel，跨 ChatGPT、Claude、Gemini、Grok 執行可靠的多 AI workflow。`

```
Multi-AI Chat 把你已經登入的 ChatGPT、Claude、Gemini、Grok 分頁組成一個多 AI workflow——就在 Chrome 的 Side Panel 裡。不需要模型 API Key，也沒有額外的對話後端：它直接操作你平常在用的 provider 網頁。

模式
• 自由分送 — 一個問題同時送給所有勾選的 provider，最適合快速比較。
• 四方辯證 — 正方 → 反方 → 判官 → 綜合。
• 多方諮詢 — 兩份獨立回答 → 審查 → 最終答案。
• Coding — 規格、審查、實作、測試、驗收共八步。
• 道理辯證 — 四家 AI 五輪辯證，逐步收斂。

為什麼可靠
• 輸入 selector 會重試、rich editor 會驗證，送出用 Enter 做最後 fallback。
• 每次呼叫都有 request ID，晚到的回答不會完成錯誤的流程。
• Stop 是真的停止——拒絕 waiter，並要求每個 provider 頁面停止生成。
• 只有 composer 確認你已登入，分頁才會顯示「就緒」。

還有
• 本機最多保存 30 個對話，可開新對話，也可在流程結束後繼續追問。
• 回應用安全的 Markdown 呈現。
• 五種 UI 語言：English、繁體中文、日本語、Deutsch、한국어。
• 可選的一鍵發佈：用你自己的 token 把對話發到 HackMD。

隱私
你的問題直接送到你本來就在用的 provider 網頁。沒有 Multi-AI Chat 伺服器、沒有分析追蹤，也沒有模型 API 憑證。設定、對話與選填的 HackMD token 都只存在你的瀏覽器本機。

說明
本外掛會自動操作第三方網頁；provider 改版可能暫時使 selector 失效，自動化也可能受各服務條款約束——請只使用你有權使用的帳號與內容。已知問題：在 Microsoft Edge 上，Claude 可能因瀏覽器封鎖外掛在 claude.ai 執行而無法連線，請改用 Google Chrome。
```

### 日本語 (ja)

**Summary (≤132):** `1つの Side Panel から ChatGPT・Claude・Gemini・Grok をまたぐ安定した複数AI workflow を実行。`

```
Multi-AI Chat は、ログイン済みの ChatGPT・Claude・Gemini・Grok タブを、Chrome の Side Panel から1つの複数AI workflow としてまとめます。モデルAPIキーも独自の会話backendも不要で、普段使っている provider ページを直接操作します。

モード
• 自由送信 — 選択したすべての provider へ並列送信。素早い比較に最適。
• 四者討論 — 賛成 → 反対 → 判定 → 統合。
• 多角相談 — 独立回答2件 → Review → 最終回答。
• Coding — 仕様・Review・実装・Test・修正・受入の8ステップ。
• 円卓討論 — 4つの AI が5ラウンドで議論し収束。

信頼性
• 入力 selector の再試行、rich editor の検証、最後は Enter fallback。
• すべての呼び出しに request ID。遅延した回答が誤った workflow を完了させません。
• Stop は本当に停止——waiter を解除し、各 provider ページに生成停止を要求。
• composer がログインを確認した後にのみ「準備完了」と表示。

その他
• 最大30件のローカル会話、新しい会話、workflow後の継続質問。
• 応答は安全な Markdown で表示。
• 5言語UI：English、繁體中文、日本語、Deutsch、한국어。
• 任意のワンクリック公開：自分のトークンで会話を HackMD に投稿。

プライバシー
プロンプトは普段使っている provider ページへ直接送られます。Multi-AI Chat サーバー、解析、モデルAPI認証情報はありません。設定・会話・任意の HackMD トークンはすべてブラウザのローカルに保存されます。

注意
本拡張は第三者のWeb UIを自動操作します。provider の変更で selector が一時的に壊れることがあり、自動化は各サービスの規約の対象となる場合があります。利用権限のあるアカウントとコンテンツのみ使用してください。既知の問題：Microsoft Edge では、ブラウザが claude.ai 上での拡張機能実行をブロックするため Claude に接続できないことがあります。Google Chrome をご利用ください。
```

### Deutsch (de)

**Summary (≤132):** `Zuverlässige Multi-KI-Workflows über ChatGPT, Claude, Gemini und Grok – aus einem Side Panel.`

```
Multi-AI Chat verbindet deine angemeldeten ChatGPT-, Claude-, Gemini- und Grok-Tabs zu einem Multi-KI-Workflow – direkt im Chrome Side Panel. Keine Modell-API-Schlüssel und kein separater Gesprächsserver: Es steuert die Provider-Seiten, die du ohnehin nutzt.

Modi
• Frei — eine Frage parallel an alle ausgewählten Provider, ideal zum Vergleichen.
• Debatte — Pro → Contra → Urteil → Synthese.
• Beratung — zwei unabhängige Antworten → Prüfung → Ergebnis.
• Coding — acht Schritte: Spezifikation, Reviews, Umsetzung, Tests, Abnahme.
• Rundtisch — vier KIs debattieren in fünf Runden bis zur Konvergenz.

Warum zuverlässig
• Eingabe-Selektoren mit Retry, geprüfte Rich-Editoren, Enter als Fallback.
• Jeder Aufruf hat eine Request-ID; verspätete Antworten schließen keinen falschen Workflow ab.
• Stop stoppt wirklich – löst Waiter auf und bittet jede Provider-Seite, die Generierung zu beenden.
• „Bereit" erscheint erst, wenn der Composer die Anmeldung bestätigt.

Außerdem
• Bis zu 30 lokale Gespräche, Neuer Chat und Folgefragen nach jedem Workflow.
• Antworten werden als sicheres Markdown dargestellt.
• Fünf UI-Sprachen: English, 繁體中文, 日本語, Deutsch, 한국어.
• Optionale Ein-Klick-Veröffentlichung eines Gesprächs auf HackMD (mit deinem eigenen Token).

Datenschutz
Deine Prompts gehen direkt an die Provider-Seiten, die du bereits nutzt. Es gibt keinen Multi-AI-Chat-Server, keine Analyse und keine Modell-API-Zugangsdaten. Einstellungen, Gespräche und der optionale HackMD-Token werden nur lokal im Browser gespeichert.

Hinweis
Diese Erweiterung automatisiert Weboberflächen Dritter; Provider-Änderungen können Selektoren vorübergehend beschädigen, und automatisierte Nutzung kann den jeweiligen Bedingungen unterliegen – verwende nur berechtigte Konten und Inhalte. Bekanntes Problem: Unter Microsoft Edge verbindet sich Claude möglicherweise nicht, weil der Browser die Erweiterung auf claude.ai blockieren kann; nutze dafür Google Chrome.
```

### 한국어 (ko)

**Summary (≤132):** `하나의 Side Panel에서 ChatGPT, Claude, Gemini, Grok을 아우르는 안정적인 다중 AI workflow.`

```
Multi-AI Chat는 로그인된 ChatGPT, Claude, Gemini, Grok 탭을 Chrome Side Panel 하나에서 다중 AI workflow로 묶어 줍니다. 모델 API 키나 별도의 대화 서버가 필요 없으며, 평소 사용하는 provider 페이지를 직접 제어합니다.

모드
• 자유 전송 — 선택한 모든 provider에 병렬 전송, 빠른 비교에 최적.
• 사자 토론 — 찬성 → 반대 → 판정 → 종합.
• 다자 자문 — 독립 답변 2개 → 검토 → 최종 답변.
• Coding — 명세, 검토, 구현, 테스트, 인수의 8단계.
• 원탁 토론 — 4개 AI가 5라운드로 토론하며 수렴.

안정성
• 입력 selector 재시도, rich editor 검증, 마지막엔 Enter fallback.
• 모든 호출에 request ID가 있어 늦은 응답이 잘못된 workflow를 완료하지 않습니다.
• Stop은 실제로 중단합니다 — waiter를 해제하고 각 provider 페이지에 생성 중단을 요청.
• composer가 로그인 상태를 확인한 후에만 '준비됨'으로 표시.

그 외
• 최대 30개 로컬 대화, 새 대화, workflow 완료 후 이어서 질문.
• 응답은 안전한 Markdown으로 표시.
• 5개 언어 UI: English, 繁體中文, 日本語, Deutsch, 한국어.
• 선택적 원클릭 게시: 본인 토큰으로 대화를 HackMD에 게시.

개인정보
프롬프트는 평소 사용하는 provider 페이지로 직접 전송됩니다. Multi-AI Chat 서버, 분석, 모델 API 자격 증명이 없습니다. 설정, 대화, 선택적 HackMD 토큰은 모두 브라우저 로컬에만 저장됩니다.

참고
이 확장 프로그램은 제3자 웹 UI를 자동화합니다. provider 변경으로 selector가 일시적으로 깨질 수 있으며, 자동화는 각 서비스 약관의 적용을 받을 수 있습니다. 사용 권한이 있는 계정과 콘텐츠만 이용하세요. 알려진 문제: Microsoft Edge에서는 브라우저가 claude.ai에서 확장 프로그램 실행을 차단할 수 있어 Claude가 연결되지 않을 수 있습니다. Google Chrome을 사용하세요.
```

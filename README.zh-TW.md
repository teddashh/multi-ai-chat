# Multi-AI Chat — Chrome Side Panel

[English](./README.md) · **繁體中文** · [日本語](./README.ja.md) · [Deutsch](./README.de.md) · [한국어](./README.ko.md)

用一個輕量 Chrome 外掛，把你原本已登入的 **ChatGPT、Claude、Gemini、Grok** 分頁組成多 AI workflow。它直接操作 provider 網頁，不需模型 API Key，也沒有額外的對話後端。

**目前原始碼：v0.2.0** · Chrome 114+ · Manifest V3 · MIT

> 外掛會自動操作第三方網頁介面。Provider 改版可能暫時使 selector 失效；自動化也可能受各服務條款約束。請只使用你有權使用的帳號與內容。

## Desktop 還是瀏覽器版？

| 版本 | 適合情境 |
|---|---|
| **瀏覽器外掛（本 repo）** | 想用小巧 Side Panel 控制平常就在使用的 Chrome 分頁 |
| [Desktop app](https://github.com/teddashh/multi-ai-chat-desktop) | 需要獨立 profile、聚焦 WebView、replay、snapshot 與本機檔案 workflow |

## v0.2.0 更新

- **可靠送出。** Selector 會重試、rich editor 會驗證文字、送出按鈕優先限制在 composer，並用 Enter 做最後驗證 fallback。
- **不必手動點進分頁。** Service worker 重啟後會重新尋找 provider tab；舊分頁缺 content script 時會自動補注入。
- **Request 隔離。** 每次 provider 呼叫都有 ID，晚到的舊回答不會完成錯誤流程。
- **真正停止。** Stop 會拒絕 waiter，並要求 provider 頁面停止生成。
- **修好圖片與 Gemini。** ChatGPT 只有圖片也會完成；Gemini 不再用 `innerHTML` 觸發 Trusted Types 錯誤。
- **真實連線狀態。** 只有 composer 確認已登入時才顯示「就緒」。
- **本機對話記錄。** 最多保存 30 個 session，可新對話，也可在 workflow 後繼續追問。
- **Markdown transcript。** 使用安全 React renderer，不再只是整片純文字。
- **五種 UI 語言。** English、繁體中文、日本語、Deutsch、한국어。
- **新版 Side Panel。** 精簡模式卡、模式說明、自由模式目標、連線引導與小型流程追蹤。

## 模式

| 模式 | 流程 |
|---|---|
| **自由分送** | 所有已勾選且就緒的 provider 平行回答 |
| **四方辯證** | 正方 → 反方 → 判官 → 綜合 |
| **多方諮詢** | 兩份獨立回答 → 審查 → 最終答案 |
| **Coding** | 八步規格、review、實作、測試、修正與驗收 |
| **道理辯證** | 五輪 × 四家 = 二十次發言 |

## 從原始碼安裝

需要 Chrome 114+、Node.js 20+ 與 npm。

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

接著：

1. 開啟 `chrome://extensions`。
2. 打開「開發人員模式」。
3. 選「載入未封裝項目」，指定產生的 `dist/`。
4. 固定 Multi-AI Chat，點 icon 開啟 Side Panel。
5. 每家 provider 開啟並登入一次；偵測到 composer 後連線卡會變成「就緒」。

開發時執行 `npm run dev`，在 `chrome://extensions` 重新載入，再重開 Side Panel。

## 使用方式

1. 選擇 workflow 模式。
2. 自由模式預設四家全選，也可以關掉不需要的 provider。
3. 展開「AI 連線」，開啟／登入缺少的服務。
4. 輸入問題，按 Enter 或「送出」。
5. 看精簡流程狀態；任何時候都能按「停止」。
6. 結束後直接接著追問，或從選單選「新對話」。

串行 workflow 執行期間請保持 Side Panel 開啟。

## 已知問題

- **Microsoft Edge + Claude。** 在 Edge 上，Claude 卡片可能一直停在「開啟」而無法連線，因為 Edge 可能封鎖擴充功能在 `claude.ai` 上執行（工具列圖示會顯示「不允許此網站上的擴充功能」，且無法授予網站存取權）。ChatGPT、Gemini、Grok 不受影響，同一份 build 在 Google Chrome 上正常。解法：Claude 請改用 Google Chrome。

## 權限與隱私

- `sidePanel`：顯示控制介面。
- `tabs`：尋找與聚焦 provider 分頁。
- `scripting` 與 provider host 權限：外掛重載後，必要時把已打包 content script 補注入舊分頁。
- `storage`：設定、最多 30 個本機對話與可選的 HackMD Token。
- `https://api.hackmd.io/*`：只有使用者明確發佈時使用；發佈筆記可由訪客閱讀，設定畫面會提醒。

外掛把 `chrome.storage.local` 限制在受信任 extension context，provider content script 讀不到 HackMD Token。Prompt 直接送到 provider 頁面；沒有 Multi-AI Chat server、telemetry 或模型 API credential。

## 開發

```sh
npm run typecheck
npm run build
npm run verify
npm audit
```

核心模組：`src/background/service-worker.ts`（編排）、`src/content/base.ts`（可靠注入）、`src/content/*.ts`（provider adapter）、`src/sidepanel/`（React UI、session、Markdown、i18n）。

Sponsored by [AI-Sister.com](https://ai-sister.com)。作者 Ted Huang（[TED@TED-H.com](mailto:TED@TED-H.com)、[ted-h.com](https://ted-h.com)）。MIT License。

特別感謝 [@DaveTseng2019](https://github.com/DaveTseng2019) 對 v0.2.x 的大量貢獻——送出／回應可靠性、連線恢復、i18n 錯誤處理、深色模式、側邊欄 UX、圖示去背，以及補上 LICENSE。

[English](README.md) | **繁體中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

---

# 🤖 Multi-AI Chat（繁體中文）

> **一個輸入框。三個大腦。無限可能。**

一款 Chrome Extension，讓你透過統一的 Side Panel 同時操控 **ChatGPT、Claude、Gemini** — 打一次字，三家 AI 同時回應；或者讓它們按照結構化流程互相辯論、互相審查。

![Screenshot](screenshot.png)

---

## ✨ 功能特色

- **統一輸入** — 打一次，廣播給三家 AI
- **5 種聊天模式** — 從自由平行聊天到複雜的多輪辯論
- **即時串流** — 回應邊生成邊顯示
- **工作流程狀態列** — 串行模式顯示目前執行到第幾步
- **角色標籤** — 每則回應標示角色（正方 / 審查者 / Coder 等）
- **角色配置** — 自訂每個模式由哪家 AI 扮演哪個角色
- **隨時取消** — 一鍵中止進行中的工作流程
- **Markdown 匯出** — 將整段對話下載為 `.md` 檔案
- **連線管理** — 偵測各 AI 登入狀態，快速登入按鈕

---

## 🎮 5 種聊天模式

### ⚡ 自由模式
同時發給三家 AI，各自獨立回答，無協作。
```
用戶 → ChatGPT
     → Claude
     → Gemini
```

### ⚔️ 三方辯證（3 步驟）
結構化正反合辯論。
```
用戶 → 正方立論（第1步）→ 反方反駁（第2步）→ 總結綜合（第3步）
```

### 🔍 多方諮詢（3 步驟）
多角度研究，含交叉審查。
```
用戶 → 先答 → 審查者補充審查 → 總結統整（第3步）
```

### 💻 Coding 模式（7 步驟）
完整軟體工程雙迴圈：規格 → 審查 → 實作 → 審查 → 修正 → 驗收 → 完稿。
```
規劃師寫規格（1）
  → 審查者挑戰規格（2）
    → Coder 寫 v1（3）
      → 審查者做 Code Review（4）
        → Coder 修正 → v2（5）
          → 規劃師驗收（6）
            → Coder 交付最終版（7）
```

### 🔄 道理辯證（15 步驟）
五輪辯證螺旋，真理越辯越明。
```
第1輪：開場立論（3 AI × 各自表態）
第2輪：交叉質疑（攻擊弱點，但承認對方好的地方）
第3輪：攻防深化（回應質疑，修正被說服的點）
第4輪：核心收斂（整理共識 vs 真正的核心分歧）
第5輪：真理浮現（最終結論，坦承立場變化）
```
每輪 3 位 AI × 5 輪 = **共 15 步驟**。

---

## 🚀 安裝方式

```bash
# 1. 複製 repo
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat

# 2. 安裝套件並建置
npm install && npm run build
```

3. 開啟 Chrome，前往 `chrome://extensions`
4. 開啟右上角的**開發人員模式**
5. 點擊**載入未封裝項目**，選擇 `dist/` 資料夾
6. 分別在不同分頁開啟 **ChatGPT**、**Claude**、**Gemini**
7. 點擊擴充功能圖示 → **開啟側面板**

> **提示：** 發送訊息前，請先確保三家 AI 都已登入。

---

## 🛠 技術架構

| 層次 | 技術 |
|---|---|
| 擴充功能 | Chrome Manifest V3、Service Worker |
| 介面 | React 18、TypeScript、Tailwind CSS |
| 建置工具 | Webpack 5 |
| 輸入注入 | ProseMirror (Claude)、Quill (Gemini)、React textarea (ChatGPT) |
| 回應擷取 | MutationObserver + 元素引用追蹤 |

---

## ⚠️ 免責聲明

這是一個**個人 side project**，純粹出於興趣與探索。它透過向 ChatGPT、Claude、Gemini 的網頁介面注入 Content Script 運作，這可能違反各平台的服務條款。

**風險自負。** 作者對任何帳號限制或其他後果不負責任。本專案與 OpenAI、Anthropic、Google 無任何關聯。

---

## 📄 授權條款

MIT — 隨便用，但別來找我負責。

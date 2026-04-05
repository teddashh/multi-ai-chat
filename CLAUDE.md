# Workspace: Multi-AI Chat
> Chrome Extension：同時操控多家 AI 網頁版的統一聊天介面

---

## Boot Sequence（每次啟動依序執行）

1. 讀 soul 檔（已在全域 CLAUDE.md 載入）
2. 讀 Layer 1：@.claude-memory/session.md
3. 讀 Layer 2：執行 `python scripts/db_read.py summary` 取得專案狀態摘要
4. 讀 Layer 3 索引：已在全域載入，按需查詢
5. 簡短告訴用戶目前狀態：「繼續 [主題]，有 X 個 open questions」

---

## This Project

- **專案名稱**：Multi-AI Chat
- **專案目的**：Chrome Extension — 同時操控 ChatGPT / Claude.ai / Gemini 網頁版，統一輸入、收集回應、跨 AI 轉發，像聊天室一樣
- **主要技術**：Chrome Extension (Manifest V3), React, Tailwind CSS, Content Scripts, MutationObserver
- **目前狀態**：初始建立，尚未開始寫 code
- **重要路徑**：
  - `src/` — Extension 主程式碼
  - `src/sidepanel/` — Side Panel UI (React + Tailwind)
  - `src/content/` — Content Scripts (ChatGPT, Claude, Gemini)
  - `src/background/` — Service Worker (message routing)
  - `public/` — manifest.json, icons

---

## Scripts 路徑

所有記憶操作 script 在：
`~/Documents/claude-setup/scripts/`

常用指令：
```
python ~/Documents/claude-setup/scripts/db_write.py decision "what" "why" "how" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_write.py resolved "what" "how" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_write.py knowledge "title" "content" "tag1,tag2"
python ~/Documents/claude-setup/scripts/db_to_md.py Multi-AI Chat
```

---

## Automatic Behaviors

### 段落完成時（自動判斷）
完成一個任務、解決一個問題、或做出一個決定時：
1. 在 session.md 加一筆記錄（5W1H 格式）
2. 用 MCP tool 寫進 memory.db（`memory_record_decision` / `memory_record_resolved` / `memory_record_knowledge`）
3. 告訴用戶：「已記錄：[一句話摘要]」

### 用戶說「記下來：XXX」（隨時可用）
不管在做什麼，立刻把 XXX append 到 INBOX：
```
echo - [YYYY-MM-DD HH:MM] XXX >> ~/Documents/knowledge/INBOX.md
```
回報：「已丟進 INBOX ✓」，然後繼續原本的工作，不打斷流程。

### Compact 時（session.md > 100 行，或用戶說「compact」）
1. 萃取 session.md 重要內容，分類寫進 memory.db
2. 執行 db_to_md.py 把未同步的 knowledge_items 寫進 Obsidian
3. 壓縮 session.md，只保留今天還在進行中的事
4. **順便整理 INBOX**（見下方 INBOX 整理規則）
5. 回報：「compact 完成，X 筆進 SQLite，Y 筆進 Obsidian，INBOX 清了 Z 條」

### 每天第一次對話時（自動）
1. 讀 memory.db 的 open_questions 和 status
2. 如果今天的 Daily Log 不存在 → 建立，寫入 header
3. 如果 INBOX 有超過 5 條未整理 → 提醒用戶：「INBOX 有 N 條，要現在整理嗎？」
4. 簡報：「今天繼續 [主題]，有 X 個 open questions」

### 收工時（用戶說「收工」）
1. **先整理 INBOX**（見下方 INBOX 整理規則）
2. 把今天的 Daily Log summary 寫進：
   `~/Documents/knowledge/logs/Multi-AI Chat/YYYY-MM-DD-{machine}.md`
   （筆電用 `laptop`，AVD 用 `avd`。判斷方式：hostname 含 FUHQ = laptop，含 AVD = avd）
3. 執行 db_to_md.py 做最後同步
4. 更新 memory.db 的 daily_logs table
5. 一句話摘要今天做了什麼
6. 提醒用戶：Oracle sync 由 claude-setup workspace 統一管理，不需要在這裡跑

### 用戶說「整理 inbox」（手動觸發）
立刻執行 INBOX 整理，不做其他事。

---

## INBOX 整理規則

INBOX 路徑：`~/Documents/knowledge/INBOX.md`

整理時，對每一條依序判斷：

| 內容類型 | 去哪裡 |
|----------|--------|
| 關於這個 project 的決定 | → db_write.py decision |
| 關於這個 project 的問題 | → db_write.py question |
| 通用知識、技術筆記 | → db_write.py knowledge，之後同步到 Obsidian |
| 關於我自己的偏好、習慣 | → append 到 `knowledge/me/preferences.md` |
| 想法、靈感，跟目前 project 無關 | → append 到 `knowledge/notes/ideas.md` |
| 已過時或無意義的 | → 直接丟棄 |

整理完後清空 INBOX.md，只保留 header。
回報：「INBOX 整理完，共 N 條：X 進 SQLite，Y 進 knowledge，Z 丟棄」

---

## Daily Log 格式

寫入路徑：`~/Documents/knowledge/logs/Multi-AI Chat/YYYY-MM-DD-{machine}.md`
（筆電 = `laptop`，AVD = `avd`）

```markdown
---
date: YYYY-MM-DD
workspace: Multi-AI Chat
tags: []
---

# Daily Log — Multi-AI Chat — YYYY-MM-DD

## HH:MM | [主題]

- **What**: 
- **Why**: 
- **How**: 
- **Who**: 
- **Where**: 
- **When**: 
- **Tags**: #tag1 #tag2

---
```

---

## Knowledge Base 查詢規則

需要查詢背景知識時：
1. 先看全域載入的 INDEX.md
2. 只讀需要的那個檔案
3. 不要讀其他 workspace 的 logs
4. 不要一次載入多個不相關的檔案

# 🤖 Multi-AI Chat

[English](README.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

---

> **One input. Three minds. Infinite perspectives.**

A Chrome Extension that lets you control **ChatGPT, Claude, and Gemini simultaneously** through a single Side Panel UI — send one message and watch three AI giants respond in real time, or orchestrate them in structured multi-step workflows.

![Screenshot](screenshot.png)

---

## ✨ Features

- **Unified input** — type once, broadcast to all three AIs
- **5 chat modes** — from free-form parallel chat to sophisticated multi-round debates
- **Real-time streaming** — responses appear as they're generated
- **Workflow status bar** — tracks current step in serial modes with live progress
- **Role labels** — each AI response tagged with its role (正方 / Reviewer / Coder, etc.)
- **Role assignment** — customize which AI plays which role per mode
- **Cancel anytime** — abort in-progress workflows with one click
- **Markdown export** — download the full conversation as a `.md` file
- **Connection management** — detects login status per AI, one-click quick login buttons

---

## 🎮 5 Chat Modes

### ⚡ Free Mode
Send to all 3 AIs in parallel. Independent answers, no coordination.
```
User → ChatGPT
     → Claude
     → Gemini
```

### ⚔️ Debate Mode (3 steps)
Structured pro/con/summary dialectic.
```
User → Pro (step 1) → Con rebuts Pro (step 2) → Summarizer concludes (step 3)
```

### 🔍 Consult Mode (3 steps)
Multi-perspective research with cross-review.
```
User → First Answer → Reviewer checks + adds → Summarizer synthesizes (step 3)
```

### 💻 Coding Mode (7 steps)
A full software engineering double-loop: spec → review → implement → review → fix → acceptance → final.
```
Planner writes spec (1)
  → Reviewer challenges spec (2)
    → Coder writes v1 (3)
      → Reviewer does code review (4)
        → Coder fixes → v2 (5)
          → Planner does acceptance test (6)
            → Coder delivers final (7)
```

### 🔄 Roundtable Mode (15 steps)
A 5-round dialectical spiral. Truth through adversarial discussion.
```
Round 1: Opening statements (3 AIs × position)
Round 2: Cross-examination (attack weaknesses, acknowledge strengths)
Round 3: Defense + refinement (respond to challenges, update positions)
Round 4: Core convergence (map consensus vs. genuine disagreement)
Round 5: Truth emerges (final conclusions, honest position changes)
```
Each round: 3 AIs × 5 rounds = **15 total steps**.

---

## 🚀 Installation

```bash
# 1. Clone the repo
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat

# 2. Install dependencies and build
npm install && npm run build
```

3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the `dist/` folder
6. Open **ChatGPT**, **Claude**, and **Gemini** in separate tabs
7. Click the extension icon → **Open Side Panel**

> **Tip:** Make sure you're logged into all three AI services before sending messages.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3, Service Worker |
| UI | React 18, TypeScript, Tailwind CSS |
| Build | Webpack 5 |
| Input injection | ProseMirror (Claude), Quill (Gemini), React textarea (ChatGPT) |
| Response capture | MutationObserver + element reference tracking |

---

## ⚠️ Disclaimer

This is a **personal side project** built for exploration and fun. It works by injecting content scripts into ChatGPT, Claude, and Gemini's web interfaces — which may violate each platform's Terms of Service.

**Use at your own risk.** The author is not responsible for any account restrictions or other consequences. This project is not affiliated with OpenAI, Anthropic, or Google.

---

## 📄 License

MIT — do whatever you want, just don't blame me.

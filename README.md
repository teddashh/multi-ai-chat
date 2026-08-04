# Multi-AI Chat — Chrome Side Panel

**English** · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · [Deutsch](./README.de.md) · [한국어](./README.ko.md)

A lightweight Chrome extension that turns your existing **ChatGPT, Claude, Gemini, and Grok** tabs into one multi-AI workflow. It uses the provider pages you are already logged into—no model API keys and no separate chat backend.

**Current source: v0.2.0** · Chrome 114+ · Manifest V3 · MIT

> This extension automates third-party web interfaces. A provider redesign can temporarily break selectors, and automated use may be governed by each provider’s terms. Use accounts and content you are authorized to use.

## Desktop or browser?

| Edition | Choose it when… |
|---|---|
| **Browser extension (this repo)** | You want a small Chrome Side Panel that controls tabs you already use |
| [Desktop app](https://github.com/teddashh/multi-ai-chat-desktop) | You want isolated profiles, focused live WebViews, replay, snapshots, and local-file workflows |

## What changed in v0.2.0

- **Reliable sends.** Input selectors retry, rich editors are verified, send buttons are scoped to the composer, and Enter is used as a verified fallback.
- **No manual tab detour.** Existing provider tabs are rediscovered when the service worker restarts; missing content scripts are reinjected automatically.
- **Request isolation.** Every provider request has an ID, so late responses cannot complete the wrong workflow.
- **Real cancellation.** Stop rejects active waiters and asks each provider page to stop generating.
- **Fixed image and Gemini workflows.** Image-only ChatGPT replies finish correctly; Gemini no longer violates Trusted Types by assigning `innerHTML`.
- **Honest connection state.** A tab is “Ready” only after its composer confirms that the user is logged in.
- **Conversation history.** Up to 30 sessions are stored locally, with a New chat action and continued follow-up after any workflow.
- **Readable transcript.** Responses use a safe React Markdown renderer instead of raw plain text.
- **Five UI languages.** English, Traditional Chinese, Japanese, German, and Korean.
- **Modern Side Panel.** Compact mode cards, descriptions, selected free-mode targets, connection setup, and a small workflow trace.
- **Light, dark, or system.** Dark mode follows your OS by default, plus a manual Light / Dark / System switch in Settings, with WCAG-checked contrast.

## Modes

| Mode | Workflow |
|---|---|
| **Free** | Send to all selected ready providers in parallel |
| **Debate** | Pro → Con → Judge → Synthesis |
| **Consult** | Two independent answers → Review → Final answer |
| **Coding** | Eight-step specification, review, implementation, test, revision, and acceptance loop |
| **Roundtable** | Five rounds × four AIs = twenty turns |

## Install from source

Requirements: Chrome 114+, Node.js 20+, and npm.

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose the generated `dist/` folder.
4. Pin **Multi-AI Chat**, then click its icon to open the Side Panel.
5. Open each provider once and sign in. The connection card changes to **Ready** after the composer is detected.

During development, use `npm run dev`, reload the extension from `chrome://extensions`, and reopen the Side Panel.

## Use

1. Choose a workflow card.
2. In Free mode, leave all four selected or turn off providers you do not need.
3. Expand **AI connections** and open/sign in to any missing provider.
4. Enter one question and press Enter or **Send**.
5. Follow the compact workflow status. Press **Stop** at any time.
6. Continue the conversation after completion, or open the menu and choose **New chat**.

Keep the Side Panel open while a serial workflow is running.

## Known issues

- **Microsoft Edge + Claude.** On Edge, the Claude card can stay stuck at "Open" and never connect, because Edge may block the extension from running on `claude.ai` (the toolbar icon shows "This extension is not allowed on this site" and site access cannot be granted). ChatGPT, Gemini, and Grok are unaffected, and the same build works in Google Chrome. Workaround: use Google Chrome for Claude.

## Permissions and privacy

- `sidePanel`: displays the control UI.
- `tabs`: finds and focuses provider tabs.
- `scripting` plus provider host permissions: repairs/reinjects the packaged content script when an existing tab predates an extension reload.
- `storage`: keeps settings, up to 30 local conversations, and the optional HackMD token.
- `https://api.hackmd.io/*`: used only when the user explicitly publishes. Published notes are guest-readable; the Settings screen warns about this.

The extension sets `chrome.storage.local` to trusted extension contexts so provider content scripts cannot read the HackMD token. Prompts travel directly to provider pages; there is no Multi-AI Chat server, telemetry, or model API credential.

## Development

```sh
npm run typecheck
npm run build
npm run verify
npm audit
```

Main modules:

- `src/background/service-worker.ts` — workflow orchestration, request IDs, cancellation, tab recovery
- `src/content/base.ts` — verified input/send/response engine
- `src/content/*.ts` — provider-specific selectors and editor strategies
- `src/sidepanel/` — React UI, sessions, Markdown, i18n

## Project

Sponsored by [AI-Sister.com](https://ai-sister.com). Created by Ted Huang ([TED@TED-H.com](mailto:TED@TED-H.com), [ted-h.com](https://ted-h.com)).

Special thanks to [@DaveTseng2019](https://github.com/DaveTseng2019) for the substantial v0.2.x contributions — send/response reliability, connection recovery, i18n error handling, dark mode, side-panel UX, the transparent icon, and the LICENSE.

MIT License.

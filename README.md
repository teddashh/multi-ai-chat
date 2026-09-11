# Multi-AI Chat — Chrome Side Panel

**English** · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · [Deutsch](./README.de.md) · [한국어](./README.ko.md)

[Official website](https://teddashh.github.io/multi-ai-chat/) · [Download v0.2.1](https://github.com/teddashh/multi-ai-chat/releases/tag/v0.2.1) · [Desktop edition](https://teddashh.github.io/multi-ai-chat-desktop/)

Ask once and put four AIs to work. Multi-AI Chat is a lightweight Chrome Side Panel that coordinates your signed-in **ChatGPT, Claude, Gemini, and Grok** tabs. It uses the provider pages you already have access to—there are no model API keys and no separate chat backend.

**Current release: v0.2.1** · Chrome 114+ · Manifest V3 · Five interface languages · MIT

> Multi-AI Chat automates third-party web interfaces. A provider redesign can temporarily break page selectors, and automated use may be governed by each provider's terms. Use only accounts and content you are authorized to use.

![Multi-AI Chat running a multi-provider workflow in Chrome](./store/screenshot-1280x800.png)

## Choose your edition

| Edition | Best for |
|---|---|
| **Browser extension (this repository)** | A small Chrome Side Panel that works with the provider tabs you already use |
| [Multi-AI Chat Desktop](https://teddashh.github.io/multi-ai-chat-desktop/) | Isolated provider profiles, focused live WebViews, snapshots, replay, checkpoints, and local-file workflows |

Both editions use the providers' web sessions and do not require model API keys.

## Highlights

- One prompt across ChatGPT, Claude, Gemini, and Grok, with per-provider readiness shown before a run.
- Request IDs isolate late responses; Stop cancels active waiters and asks provider pages to stop generating.
- Up to 30 conversations are stored locally, with safe Markdown rendering, follow-up messages, and New chat.
- English, Traditional Chinese, Japanese, German, and Korean UI.
- Light, dark, or system appearance with WCAG-checked contrast.
- Optional, explicit publishing to HackMD with your own token.

## Workflows and recovery

| Mode | Workflow |
|---|---|
| **Free** | Send in parallel to every selected provider that is ready |
| **Debate** | Pro → Con → Judge → Synthesis |
| **Consult** | Two independent answers → Review → Final answer |
| **Coding** | Eight steps covering specification, review, implementation, testing, revision, and acceptance |
| **Roundtable** | Five rounds × four AIs = twenty contributions |

If a provider fails during Roundtable, the workflow pauses and offers **Retry**, **Skip this turn**, or **Cancel**. Retry uses a fresh request ID. Skip inserts a safe placeholder only into the remaining Roundtable context, so provider error text and stale responses cannot leak into later turns or the transcript.

## Install

### Release ZIP (recommended)

The GitHub Release package is ready to load as an unpacked extension; no source build is required.

1. Download [`multi-ai-chat-store-v0.2.1.zip`](https://github.com/teddashh/multi-ai-chat/releases/download/v0.2.1/multi-ai-chat-store-v0.2.1.zip) and its [checksum file](https://github.com/teddashh/multi-ai-chat/releases/download/v0.2.1/multi-ai-chat-store-v0.2.1.zip.sha256).
2. Verify the archive. The expected SHA-256 is `c840f4e8f3ccca1478271b31d80597622563b64182b3527de786d67d546f6962`.

   ```powershell
   (Get-FileHash .\multi-ai-chat-store-v0.2.1.zip -Algorithm SHA256).Hash.ToLower()
   ```

   ```sh
   shasum -a 256 multi-ai-chat-store-v0.2.1.zip
   ```

3. Extract the ZIP to a permanent folder. Its root contains `manifest.json`.
4. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that extracted folder.
5. Pin **Multi-AI Chat**, click its icon to open the Side Panel, then open and sign in to each provider once. A provider becomes **Ready** after its composer is detected.

When updating, extract the new release to its own folder, point **Load unpacked** to that folder, and remove the older unpacked copy after confirming the new version works.

### Build from source

Requirements: Chrome 114+, Node.js 22.18+, npm, and Git.

```sh
git clone https://github.com/teddashh/multi-ai-chat.git
cd multi-ai-chat
npm ci
npm run verify
```

Then load the generated `dist/` folder from `chrome://extensions`. During development, run `npm run dev`, reload the extension from that page, and reopen the Side Panel.

## Use

1. Choose a workflow card.
2. In Free mode, keep all four providers selected or turn off any you do not need.
3. Expand **AI connections** and open or sign in to missing providers.
4. Enter a question and press Enter or **Send**.
5. Follow the workflow status; press **Stop** at any time.
6. Continue the conversation after completion, or use the menu to start a **New chat**.

Keep the Side Panel open while a serial workflow is running.

## Known limitation

- **Microsoft Edge + Claude:** Edge may prevent the extension from running on `claude.ai`, leaving the Claude card at **Open** with “This extension is not allowed on this site” and no usable site-access control. ChatGPT, Gemini, and Grok are unaffected. The same build works in Google Chrome, which is the current workaround for Claude.

## Permissions and privacy

| Access | Why it is needed |
|---|---|
| `sidePanel` | Displays the entire control interface |
| `tabs` | Finds and focuses provider tabs and tracks their load, navigation, reload, and close state; it is not used to read unrelated tabs |
| `scripting` | Re-injects only the extension's packaged content scripts when a provider tab predates an extension reload or its script was evicted; no remote code is executed |
| `storage` | Stores interface settings, up to 30 local conversations, and an optional HackMD token on your device |
| Provider hosts | On `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`, and `grok.com`, types prompts, sends them, and reads on-page responses for the selected workflow |
| `api.hackmd.io` | Contacted only after you explicitly choose **Publish**, using your token to create a guest-readable note |

Prompts go directly to the provider pages you select. There is **no Multi-AI Chat server, analytics, tracking, advertising, telemetry, or model API credential**. The optional HackMD token is restricted to trusted extension contexts, so provider content scripts cannot read it. Local data remains in Chrome until you clear it or remove the extension; removing the extension deletes its local storage. Provider and HackMD privacy policies still apply to content you choose to send them.

Read the complete [privacy policy](./store/PRIVACY.md).

## Development

```sh
npm run typecheck
npm run test
npm run build
npm run verify
npm audit
```

Key modules:

- `src/background/service-worker.ts` — workflow orchestration, request isolation, cancellation, and tab recovery
- `src/content/base.ts` — verified input, send, and response engine
- `src/content/*.ts` — provider-specific selectors and editor strategies
- `src/sidepanel/` — React interface, local sessions, Markdown, themes, and localization

Please run `npm run verify` before opening a pull request. For a provider-page breakage, [open an issue](https://github.com/teddashh/multi-ai-chat/issues) with the provider and browser version, but remove prompts, responses, account details, and tokens from screenshots or logs.

## Project and credits

- [Official website](https://teddashh.github.io/multi-ai-chat/)
- [GitHub Releases](https://github.com/teddashh/multi-ai-chat/releases)
- [Source and issue tracker](https://github.com/teddashh/multi-ai-chat)
- [Multi-AI Chat Desktop](https://teddashh.github.io/multi-ai-chat-desktop/)
- [MIT License](./LICENSE)

Sponsored by [AI-Sister.com](https://ai-sister.com). Created by Ted Huang ([TED@TED-H.com](mailto:TED@TED-H.com), [ted-h.com](https://ted-h.com)).

Special thanks to [@DaveTseng2019](https://github.com/DaveTseng2019) for substantial v0.2.x contributions: send and response reliability, connection recovery, localized error handling, dark mode, Side Panel UX, the transparent icon, and the project license.

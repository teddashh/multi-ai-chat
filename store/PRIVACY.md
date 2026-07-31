# Privacy Policy — Multi-AI Chat (Chrome extension)

**Effective date:** 2026-07-31

Multi-AI Chat is a Chrome Side Panel extension that lets you send one prompt to the
ChatGPT, Claude, Gemini, and Grok tabs you are already signed into. This policy explains
what it accesses and what it does **not** do.

## The short version

- **No developer server.** There is no Multi-AI Chat backend. Your prompts go directly to the
  provider pages you already use.
- **No analytics, no tracking, no ads, no telemetry.**
- **No model API keys**, and no account data is collected by the developer.
- Everything the extension stores stays **local to your browser**.

## What the extension accesses

- **Prompt and response text on provider pages.** To run a workflow, the content script types
  your prompt into the provider's composer, sends it, and reads the on-page response so it can be
  shown in the Side Panel and passed to the next step. This text is processed locally.
- **Local storage.** Your UI language, up to 30 recent conversations, and an optional HackMD API
  token are stored with `chrome.storage.local` on your device. The HackMD token is confined to
  trusted extension pages so provider content scripts cannot read it.
- **Tab state.** The extension detects when a provider tab loads, navigates, reloads, or closes
  so it can show accurate connection status. It does not use this to read unrelated tabs.

## What is sent off your device — and only when you ask

- **The provider pages themselves.** Your prompt is delivered to the ChatGPT/Claude/Gemini/Grok
  page you are already using, exactly as if you had typed it there. Those services' own privacy
  policies apply to what you send them.
- **HackMD publishing (optional).** If, and only if, you click **Publish**, the current
  conversation is sent to HackMD using your own token to create a note. Published HackMD notes are
  guest-readable per HackMD's settings. If you never publish, nothing is sent to HackMD.

Nothing is ever sent to the developer.

## Data retention and control

- Conversations and settings remain in your browser until you delete them (via **New chat**,
  clearing conversations, clearing the token in Settings, or removing the extension).
- Removing the extension deletes its local storage.

## Data sharing

The developer does not sell, rent, or transfer your data to third parties, and does not use it
for any purpose beyond the extension's single purpose (running your multi-AI workflows).

## Permissions, briefly

`sidePanel` (the UI), `tabs` (find/focus provider tabs and read connection status),
`scripting` (re-inject the extension's own bundled content script when needed — never remote
code), `storage` (local settings/conversations/token), host access to the four provider domains
(to automate their pages) and `api.hackmd.io` (only when you publish).

## Changes

Material changes to this policy will be reflected by updating the effective date above.

## Contact

Ted Huang — [TED@TED-H.com](mailto:TED@TED-H.com) · [ted-h.com](https://ted-h.com)

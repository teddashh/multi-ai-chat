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
```

# PR42 — next listing draft (candidate text only)

Not a Store upload, merge, or QC pass. **This branch stays 0.2.3.** The next Meta-capable listing version is **TBD** (choose when packaging; do not reuse 0.2.3). Existing `store/SUBMISSION.md` is the released four-provider copy and is unchanged. Paste from **Candidate (TBD)** below only after that version exists.

## Inventory (this checkout)

- SHA is the current `feat/meta-ai-provider` head after this checkpoint; version files **0.2.3**.
- Manifest vs `origin/master`: same `sidePanel` / `tabs` / `storage` / `scripting`; `https://www.meta.ai/*` and `https://meta.ai/*` are optional host permissions, requested only when the user activates Meta, and declining keeps Meta on standby. No static `content/meta.js` entry. No Facebook/Instagram/Meta-auth hosts. HackMD host unchanged.
- Defaults in source: ChatGPT, Claude, Gemini, Grok active; Meta experimental standby; exactly four active; standby and targets persist; no model API keys; browser provider sessions.
- `store/PRIVACY.md` on this branch already describes Meta; listing pack still four-provider; site still four-provider. No live Store item was queried here.
- `dist/sidepanel.js` SHA-256 `22eb259ef6640942d249f47084b54485289ed37485838723d978007ce52bd82f`.

## Remaining VM evidence (facts, not a gate)

From `META-AI-SMOKE.md` / `META-AI-UX-QC.md` at this SHA: VM-01 load+default four, VM-02 standby/readiness, VM-03 send/stream/Stop, VM-04 four-way + Meta role, VM-05 Retry/Skip/Cancel, VM-06 restart/restore, VM-07 original four/export/five languages, and authenticated Side Panel UX are **NOT_RUN**. Conductor VM 2–3 PASS is recorded on older SHAs `3976212` / `74f0919`. Local 195 tests and DOM fixtures are not live provider/VM results.

---

## Candidate (TBD) — English listing

**Item name:** `Multi-AI Chat`  
**Summary (≤132):** `Run reliable multi-AI workflows across ChatGPT, Claude, Gemini, Grok, and optional Meta AI from one side panel.`  
**Category / language:** Productivity (Workflow & Planning) · English

### Detailed description

```
Multi-AI Chat turns the ChatGPT, Claude, Gemini, and Grok tabs you already use into one
multi-AI workflow — right inside Chrome's Side Panel. There are no model API keys and no
separate chat backend: it drives the provider pages in your browser. Meta AI is an
experimental optional replacement: Settings → Standby provider swaps one of the original
four for Meta AI, keeps exactly four providers active, and preserves the standby choice
and existing browser sessions.

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
• If a Roundtable provider fails, choose Retry, Skip this turn, or Cancel; retries are isolated
  with a fresh request ID, while skips use a safe placeholder only in the remaining Roundtable
  context instead of passing error text to later turns.
• A tab is Ready when its composer is usable. Meta AI can be Ready with an enabled guest
  composer when the site offers one; a login wall still shows Sign in.

ALSO
• Up to 30 conversations are stored locally, with a New chat action and follow-up after any run.
• Responses render as safe Markdown.
• Five UI languages: English, Traditional Chinese, Japanese, German, Korean.
• Optional one-click publish of a conversation to HackMD (using your own token).

PRIVACY
Your prompts travel directly to the provider pages you already use. There is no Multi-AI Chat
server, no analytics, and no model API credential. Settings (including standby), conversations,
and the optional HackMD token are stored locally in your browser. See the privacy policy.

NOTE
This extension automates third-party web interfaces. A provider redesign can temporarily break
selectors, and automated use may be governed by each provider's terms — use accounts and content
you are authorized to use. Known issue: on Microsoft Edge, Claude may not connect because the
browser can block the extension on claude.ai; use Google Chrome for Claude.
```

### Single purpose

```
Multi-AI Chat provides one Chrome Side Panel that sends a single prompt to four of the user's
ChatGPT, Claude, Gemini, Grok, or optional Meta AI browser tabs and orchestrates multi-step
comparison workflows (free, debate, consult, coding, roundtable) across them. Exactly four
providers are active; Meta AI is experimental and off until the user chooses a standby swap.
```

### Replacement justifications (tabs / host / storage only)

`tabs`  
Locates and focuses the user's existing ChatGPT, Claude, Gemini, Grok, and (when selected) Meta AI tabs and detects when a provider tab loads, navigates, reloads, or closes, so the panel shows accurate connection status. Not used to read unrelated tab contents.

**Host access** to `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`, `grok.com`  
The content script must run on these provider app pages to type the prompt into the composer, press send, and read back the on-page response so it can be shown in the Side Panel and passed to the next workflow step. These are the sites the extension automates by default. Access to `www.meta.ai` and `meta.ai` is optional, requested only when the user activates Meta; declining keeps Meta on standby. Meta authentication, Facebook, and Instagram are not additional host permissions.

`storage`  
Saves the user's own data locally: UI language, appearance, standby provider, selected Free-mode targets, up to 30 recent conversations, and the optional HackMD token. The standby choice persists across restarts. Nothing is sent to the developer.

Leave `sidePanel`, `scripting`, `api.hackmd.io`, and Remote code **No** as in `store/SUBMISSION.md`. After a TBD version bump, update listing + justifications + privacy URL together; current listing images remain the four-provider assets until replaced.

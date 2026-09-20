# Meta AI source-port validation

For the current targeted VM re-QC, use [Step3: stream, final and Stop](META-AI-STEP3.md).
It includes fixed prompts, an optional metadata observer, and a compact result template.

Latest Conductor handoff (`multi-mac-0921ET-unreadiness-ux`) reports VM Steps 2–3
PASS with the Lexical fix at `3976212` and streaming candidate `74f0919`.
Steps 4–5 still await the other required providers. The current UX follow-up names
those readiness blockers; it does not change provider login or workflow recovery.

After reloading the candidate extension, the existing Meta-only-ready VM can check
these UI changes without another login (Grok on standby):

- Debate / Consult: the input-area notice names **ChatGPT · Claude · Gemini**;
  sending stays disabled until the assigned providers are ready.
- Free with all four selected: sending remains available; the notice says only
  **Meta AI** will receive the prompt and names the three skipped providers. On send,
  the workflow status/trace records that same recipient and skipped list.
- Deselect Meta in Free: the remaining three targets are named as not ready and
  sending is disabled. Select only Meta: the readiness notice disappears.

Meta AI support is experimental and unreleased. Initial selectors came from
`multi-ai-chat-desktop/adapters/meta.json` (adapter v1). The readiness fix also recognizes
the current hydrated `composer-input` textarea and contenteditable editor. Neither the
desktop probe nor the local DOM fixtures establish authenticated extension compatibility.

The default lineup remains ChatGPT, Claude, Gemini, and Grok. Settings can put one provider
on standby, leaving exactly four active. Existing browser tabs and login sessions are retained.
Unlike a desktop WebView, normal Chrome login navigation needs no extension permission on
Meta authentication, Facebook, or Instagram domains.

## Automated checks

For source changes, run `npm ci` followed by `npm run verify`. Tests cover enabled guest composers, inert/disabled
and hidden inputs, exact HTTPS Meta host recognition, all standby swaps, restored roles,
four-provider fanout through the real worker with mocked Chrome APIs, standby exclusion from
session reset/restore, workflow-time change rejection, and Meta roundtable recovery. The build
includes `content/meta.js` and the two exact Meta app host matches.

## VM handoff: get the correct unpacked build

PR: <https://github.com/teddashh/multi-ai-chat/pull/42> (`feat/meta-ai-provider`).
Use a fresh checkout so an existing local branch or installed store copy cannot mask the build:

```sh
git clone --branch feat/meta-ai-provider --single-branch https://github.com/teddashh/multi-ai-chat.git multi-ai-chat-pr42
cd multi-ai-chat-pr42
git rev-parse HEAD
git status --short
```

Record the full checkout SHA in the result below and compare it with the PR head before testing.
The committed `dist/` is ready to load; the VM does not need Node or another build/test phase.
If source is changed, rebuild with the automated checks above and confirm
`git status --short --untracked-files=all -- dist` is empty before handing off that revision.

1. Use a dedicated Google Chrome test profile and open `chrome://extensions`.
2. Enable Developer mode, choose **Load unpacked**, and select this checkout's `dist/` folder
   (the directory containing `manifest.json`, not the repository root).
3. Record the extension ID and loaded directory. The version still reads **0.2.3**; identify
   this candidate by checkout SHA and the **Standby provider** setting, not version alone.
4. Pin the extension and click its toolbar icon to open the actual Side Panel. Confirm the
   panel renders and `chrome://extensions` reports no load/runtime error.
5. Complete provider login in ordinary tabs of this same profile. Keep the Side Panel open
   during serial workflows. Use only this unpacked copy in the test profile.

## Existing evidence and what remains

Implementation baseline `be9c6fc` passed 113 tests, typecheck, production build, version
consistency, and GitHub Verify/CodeQL. On 2026-09-20, a clean local Chromium profile loaded
the rebuilt extension, started its worker, and rendered `sidepanel.html` without page errors.
The UI showed the original four providers and five standby choices with Meta selected;
rebuilding left committed `dist/` unchanged. That check opened the extension page directly;
actual docked Side Panel behavior and live provider interactions remain for VM QC.

`READY_FOR_VM_E2E=yes` / `READY_FOR_VM_REQC=yes` mean this candidate is available for testing.
They are not live-provider passes or merge/store recommendations.

### Readiness fix and VM re-QC

The first VM QC found that authenticated Meta accepted direct prompts but the extension
reported `login-required`, blocking orchestration. Local inspection on 2026-09-20 found
an inert guest landing input; dismissing the sign-in card enabled it, while sending opened
a real login modal. The live site's loaded composer code renders either a textarea or
Lexical contenteditable with `data-testid="composer-input"`; the legacy prehydration
attribute is conditional. Send and Stop still use `composer-send-button` and
`composer-stop-button`. No authenticated DOM was available in the local guest profile.

The fix accepts a visible, usable composer even beside an optional guest login button.
A visible login modal or inert login input still reports login required. Missing or
temporarily disabled editors without login evidence report checking rather than Sign in.
The other four providers retain their existing boolean readiness behavior.

At `42d8454`, `npm run verify` passed 123 tests, typecheck, production build and version 0.2.3
consistency. A clean Chromium profile loaded the rebuilt extension. Controlled textarea
and contenteditable fixtures exercised actual content-script/worker readiness transport,
two distinct sends including Unicode/multiline input, response capture, scoped Stop and
login-wall transitions without page errors. These fixtures did not run real Meta responses,
Lexical's framework, serial workflows or recovery; those still need VM evidence.

For the existing dedicated VM checkout, pull `feat/meta-ai-provider` with `--ff-only` and
record the new full SHA. Reload this unpacked extension in `chrome://extensions`, then
reload the already authenticated Meta tab so it gets the new content script. Reopen the
Side Panel and put Grok on standby. Verify VM-02 now reaches Ready, then repeat VM-03
through VM-05 below; ensure the other active providers are ready before multi-provider runs.
If it stays checking or shows Sign in, record only composer tag, role, aria-label,
placeholder, contenteditable, test id, inert state and visible login controls, plus the
extension status. Do not export the browser profile or account data.

### Input dispatch follow-up

VM re-QC at `42d8454` passed readiness but failed dispatch with
`editor text did not match the requested prompt`. In a local browser running real Lexical
0.51.0, the old injector reproduced that error: `execCommand`, its extra synthetic input
event and the direct-DOM fallback left three copies of the prompt in both DOM and editor
state. A plain contenteditable fixture had missed this framework behavior.

Meta now selects the editor contents, lets Lexical observe the selection, dispatches one
plain-text paste, and waits for reconciliation before the unchanged shared text assertion.
It does not replay the insertion or replace Lexical-owned DOM. Native input/textarea
controls retain their native value setter and one input event. Rejected paste still fails
the text assertion rather than sending an unrelated draft; text matching was not loosened.

At `3976212`, validation passed 127 tests, typecheck, production build and version 0.2.3 consistency.
The rebuilt unpacked extension was checked against actual Lexical 0.51.0 and textarea
fixtures over Chrome's content-script transport: exact editor-state text, replacement of
a leftover draft, single sends, Unicode/blank lines/Markdown/emoji, response chunks/finals,
scoped Stop and rejection of a blocked paste all passed without page errors. Lexical was
installed only in a temporary fixture directory, not as an extension dependency. These
results do not establish Meta's authenticated live send/stream/Stop behavior.

After the extension and Meta tab reload described above, resume VM-03 with only Meta
selected. Confirm one provider-side prompt, matching streamed/final text and Stop while
generation is active. Continue VM-04/05 once dispatch passes and all required seats are ready.

### Streaming while Stop is visible

A follow-up browser fixture at `3976212` found that Meta emitted no response chunks while
its Stop button remained visible: both mutation handling and polling treated the button
as a reason to skip reading answers. Meta now opts into reading response text during that
busy signal. The signal still delays completion, scoped Stop still cancels pending capture,
and an actively generating provider with no answer text still keeps its slow-response grace.
The other four providers retain their existing thinking-text behavior; input matching is unchanged.

Validation passes 132 tests, typecheck, production build and version 0.2.3 consistency.
The regression suite covers mutation/poll capture during generation, no premature final,
slow generation without text, cancellation, and unchanged default behavior. The unpacked
extension fixture also checks chunks arrive **before** Meta's Stop disappears, then captures
the completed reply. This remains controlled browser evidence; authenticated VM Step3+
at this revision still needs a result.

## Manual checks — pending (VM-01 through VM-07)

1. Load the built `dist/` directory as an unpacked extension. Existing v0.2.3 releases do not
   include this feature. Open all five provider tabs and confirm only the default four appear
   in the panel until Settings changes the standby provider.
2. Put Grok on standby, open Meta, and check its current guest/login state. A visible input
   behind an inert login overlay must show login required. An enabled guest composer can
   report ready. Complete whatever login Meta currently requires in the normal browser.
3. In Free mode, select only Meta for the isolated send check. Send a harmless prompt, then
   a multiline prompt containing Unicode and Markdown. Confirm
   exactly one send, streamed response capture, final text, and working Stop. Compare captured
   text with the actual page; verify that previous answers are not attributed to the new send.
4. Run Free with all four selected, then Debate or Consult with a Meta role. Confirm the
   standby tab receives no prompt. During a workflow, confirm the standby setting is disabled.
5. In Roundtable, exercise a Meta failure and each of Retry, Skip, and Cancel. Confirm retries
   use a new request, skipped error text is not relayed, and cancellation prevents later sends.
6. Restart Chrome and reopen an old conversation. Confirm the standby choice, selected
   targets and repaired roles persist. Start a new conversation and restore an existing one;
   verify active provider navigation and confirm standby tabs are untouched.
7. Return Meta to standby and confirm the original four seats return. Review the transcript
   and Markdown export for the Meta AI name. Check all five interface languages in Settings.

### Fixed prompts for VM-03 and VM-04

For the first send, use `Reply with exactly: META-QC-ONE`. For the next send, use:

```text
請用繁體中文回答，原樣保留以下兩行，不加說明：
META-QC-TWO：測試 ✓
**粗體** 與 `code`，第二行。
```

Compare the extension transcript with what the provider actually produced; model refusal or
format variation is not an extension capture failure. Confirm each prompt appears once on
the provider page and the second result does not reuse the first response. For Stop, request
a numbered list of 100 short sentences and stop while generation is visibly active. Record
whether the extension transcript was already growing while the provider's Stop was visible,
and whether both the workflow and provider generation stopped. If generation finished before
the click, mark the Stop check not exercised rather than passed.

### Reproduce VM-05 recovery without waiting for a timeout

Use a fresh Roundtable run for each action, with Meta assigned as the first speaker and the
other three active providers ready. Use a harmless topic such as `如何安排十分鐘的休息？每次發言最多兩句。`
After Meta accepts the prompt, close its tab while the extension is still waiting for its
response. This rejects the pending request and should show the recovery choices.

- **Retry:** reopen Meta through the connection card, wait for Ready, then choose Retry.
  Confirm the repeated step can finish and the next speaker starts; the failure must not
  instantly recur from stale state. Request-ID isolation is covered by the automated tests.
- **Skip:** choose Skip with Meta still closed. Confirm the next speaker starts and neither
  the transcript nor its outgoing prompt contains the tab-closed error. A safe skipped-turn
  placeholder in the next prompt is expected. Stop after observing the next step so this
  targeted check does not wait for Meta again in round two.
- **Cancel:** choose Cancel and confirm processing ends without sending to the next speaker.

Make the selection within four minutes; recovery has an existing 240-second decision
timeout. If the response completed before the tab was closed, that attempt did not exercise
recovery; repeat the targeted case. Restore Meta to Ready before the next independent run.

## Result to return to Conductor

Copy this block into the handoff and fill actual observations. Use `PASS`, `FAIL`, `BLOCKED`,
or `NOT_RUN`; include a short reproduction/evidence reference for a failure or blocker.
An unavailable account, regional restriction, or login challenge leaves affected live checks
blocked, not passed. Do not infer anonymous access from another region's result.

```text
Marker: babysit-0554ET-multiext-775b6ba6
PR / tested full SHA: #42 / ...
Date / timezone / tester: ...
VM OS / Chrome version / region: ...
Extension ID / loaded dist path: ...
Meta access: guest | authenticated | login-blocked (observed: ...)
VM-01 unpacked load / default four: NOT_RUN
VM-02 standby swap / readiness / login: NOT_RUN
VM-03 single send / multiline / capture / Stop: NOT_RUN (record each subcheck)
VM-04 four-way fanout / serial Meta role / selection locked during run: NOT_RUN
VM-05 Retry: NOT_RUN; Skip: NOT_RUN; Cancel: NOT_RUN
VM-06 restart / old conversation / roles / standby tab untouched: NOT_RUN
VM-07 restore original four / export / five UI languages: NOT_RUN
Evidence / failures / untested items: ...
VM_QC: PASS | FAIL | BLOCKED | INCOMPLETE
Next action for Conductor: ...
```

Record Chrome/OS versions, date, region and guest/authenticated status with the result.
Do not attach account data, cookies, tokens or private conversations.

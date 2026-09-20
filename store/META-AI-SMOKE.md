# Meta AI source-port validation

Meta AI support is experimental and unreleased. Selectors originate from
`multi-ai-chat-desktop/adapters/meta.json` (adapter v1). The desktop evidence covers a
logged-out DOM probe; it does not establish authenticated extension compatibility.

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

`READY_FOR_VM_E2E=yes` means this candidate is available for testing. It is not a live-provider
pass or a merge/store recommendation. The cases below are pending until Conductor records results.

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
whether both the workflow and provider generation stopped. If generation finished before
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
Marker: babysit-0420ET-multiext-237e5e8f
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

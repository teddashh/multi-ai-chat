# Meta-only Ready: UX sequence and reopen checks

This slice covers the named unreadiness hint, **Open unready AIs**, **Select ready AIs
only**, and closing/reopening the panel. It needs no additional provider login.

## Evidence boundaries

Castle could not access the existing authenticated VM: the available local QC file
still describes `42d8454`, and no current VM/CDP endpoint was supplied. Conductor's
handoff reports live Meta Steps 2–3 PASS at the later Lexical/streaming candidates;
that does not establish this UX sequence or multi-provider Steps 4–5.

Local Chromium launches hit SIGTRAP / inotify resource exhaustion. An isolated
container browser allowed the production `dist/sidepanel.js` to run in real Chromium
DOM with **simulated Chrome runtime/storage**. This tests the actual React interface
and page lifecycle; it does not load the extension, open real provider tabs, log in,
or establish provider send/stream/recovery compatibility.

The sequence reproduced two issues in the `d561131` runtime:

- Switch Consult → Free, select only Ready, then immediately close: targets were
  saved as Meta-only, but reopening restored Consult because the 350ms conversation
  save had not run. The panel now flushes the pending snapshot on `pagehide`.
- The empty welcome area could push the Send button below the viewport when the
  unreadiness hint was visible. That area now shrinks and scrolls independently.

The follow-up reproduced another short-panel issue in `0abba66`: a ten-line draft
plus an open-tab failure put Send at y=630.5–662.5 in a 320×600 viewport. The upper
controls area now also shrinks and scrolls, keeping the input actions in view.
The Ready-only shortcut remains reachable by scrolling that area.

The input follow-up reproduced an unintended send in `97b1aa4`: Enter with
`isComposing=true` generated one `SEND_MESSAGE` while confirming an IME candidate.
The panel now leaves composition Enter events (including legacy key code 229) to
the editor. Plain Enter still sends once; Shift+Enter still inserts a newline.

The mode accessibility follow-up found that `17d2005` exposed no selected state
for mode buttons. They now expose pressed/unpressed states in a localized group,
with decorative icons hidden from accessible names. Free recipients have their own
named group. Keyboard checks also reproduced a clipped Coding button at 320×600;
focused mode buttons now scroll into view using nearest alignment.

Local result on 2026-09-20: **PASS** in en, zh-TW, ja, de and ko (45 assertion groups,
zero page errors) using Chromium 151.0.7922.34. `npm run verify` under Node 22.18.0
also passed all 157 tests, typecheck, build and version consistency. Tested panel
bundle SHA-256: `8f6e0ebde2cfcf528bc1fb54035361faddb09731ff791d42e6c024089ece8a73`.
Actual authenticated VM UX result remains **NOT_RUN** from this seat.

## Repeatable DOM check

Use Node 22.18+ and an existing Playwright installation/browser in the QA environment:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
READINESS_BROWSER=/absolute/path/to/chrome-or-chrome-headless-shell \
READINESS_OUTPUT=/tmp/multi-ai-readiness-ui \
node scripts/check-readiness-ui.cjs
```

Alternatively set `READINESS_CDP_URL` to an available browser's local CDP endpoint.
The runner creates/closes only its own isolated contexts and does not close that
browser. **This remains a fixture run**, even when CDP belongs to a VM browser.
No new dependency or test phase is added to the extension's install or CI.

The runner checks all five locales, exact `OPEN_LOGIN` requests and partial failure,
standby exclusion even when standby is Ready, actual page close/reopen, saved
selection, changing readiness, and disabled actions during a workflow. It checks
Send at 320×600 and 420×850, a multiline draft plus open-tab error at 320×600 and
420×600, and visible/enabled Stop during a simulated workflow with a multiline
draft at 320×480 and 420×600. Draft text must remain intact after resizing.
It also dispatches simulated IME Enter events and checks that no send occurs and
the draft remains intact, then checks Shift+Enter and a single plain-Enter send.
The send is captured by the Chrome API double; no provider receives it. These
synthetic events do not establish a pass with an actual operating-system IME.
Mode checks cover localized accessible names, exactly one pressed mode, Tab plus
Enter/Space across all five modes at 320×600, focused-button visibility, restored
Free state after reopening, and disabled mode buttons during a workflow. ARIA
snapshots record the exposed semantics; an actual screen reader was not tested.
All page requests are restricted to three local `dist` assets served on the
intercepted `https://readiness.test` origin.

Output: `RESULTS.json` (status, checkout SHA, dirty-tree flag, bundle SHA-256, browser,
per-locale assertions and errors), plus `zh-TW-partial.png`, `zh-TW-reopened.png`
and `<locale>-draft-error-<width>.png` for the short-panel regression. Mode checks
also save `<locale>-mode-<mode>.png` and `<locale>-modes.aria.txt`.
Use the exit status and current report together; a fixture PASS is not a VM PASS.

## Actual VM sequence

Pull the feature branch, record its full SHA, reload the existing unpacked extension,
and open its actual Side Panel. Keep the existing Meta session; set Grok on standby.
If another provider is already Ready, record that difference rather than logging it out.

| Check | Expected with only Meta Ready |
| --- | --- |
| Free, all four selected | Hint names Meta as recipient; ChatGPT, Claude, Gemini as skipped. |
| Debate then Consult | Input blocked; the same three names appear; open-unready shortcut available. |
| Return to Free; open unready | Only those three provider tabs are focused/opened. Meta and standby Grok are untouched. No login is needed to observe this. |
| Select ready only | Only Meta is selected; hint/open-unready shortcut disappear. |
| Immediately close and reopen Side Panel | Mode remains Free, Meta remains the only selected target, no skipped-provider hint. |
| Narrow/short panel with a multiline draft | Hint and shortcuts remain readable; Send is fully visible, including after a tab-open failure if one occurs. Upper controls remain reachable by scrolling. During an actual workflow, Stop stays visible. |
| IME input with Meta selected | Enter to confirm a Chinese/Japanese/Korean candidate keeps the draft and does not start a workflow. After composition ends, Shift+Enter adds a newline and plain Enter sends once. Record the actual IME used. |
| Keyboard mode selection in a narrow panel | Tab reaches every mode; Enter/Space activates it and the focused button stays in view. With a screen reader, the localized group and pressed mode are announced without decorative emoji. |

Record each row as PASS/FAIL/BLOCKED with checkout SHA, Chrome version, active/standby
providers and observed Ready set. An actual docked-panel close/reopen result is still
required; localStorage-backed fixture persistence does not prove Chrome extension storage.
Keep account details, cookies, tokens and private conversation content out of evidence.

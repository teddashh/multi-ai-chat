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

Local result on 2026-09-20: **PASS** in en, zh-TW, ja, de and ko (35 assertion groups,
zero page errors) using Chromium 151.0.7922.34. `npm run verify` under Node 22.18.0
also passed all 157 tests, typecheck, build and version consistency. Tested panel
bundle SHA-256: `e4272f40dc4d49821d441ab31bf21ea84cec63753f8048e246141bf8e05e86a1`.
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
All page requests are restricted to
three local `dist` assets served on the intercepted `https://readiness.test` origin.

Output: `RESULTS.json` (status, checkout SHA, dirty-tree flag, bundle SHA-256, browser,
per-locale assertions and errors), plus `zh-TW-partial.png`, `zh-TW-reopened.png`
and `<locale>-draft-error-<width>.png` for the short-panel regression.
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

Record each row as PASS/FAIL/BLOCKED with checkout SHA, Chrome version, active/standby
providers and observed Ready set. An actual docked-panel close/reopen result is still
required; localStorage-backed fixture persistence does not prove Chrome extension storage.
Keep account details, cookies, tokens and private conversation content out of evidence.

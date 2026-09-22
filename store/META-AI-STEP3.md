# Meta VM Step3: stream, final and Stop

Use the existing authenticated VM profile and the actual extension Side Panel.
The runtime baseline is `fe09eaf`; a prepared checklist or a local fixture is not a VM pass.

## Load the candidate

In the dedicated VM checkout:

```sh
git switch feat/meta-ai-provider
git pull --ff-only origin feat/meta-ai-provider
git rev-parse HEAD
git status --short
```

Record that full SHA. In `chrome://extensions`, reload this checkout's unpacked `dist/`,
then reload the authenticated Meta tab and reopen the Side Panel. Put Grok on standby,
choose **Free**, select **only Meta**, and confirm **Meta AI — Ready**. Version 0.2.3
alone cannot identify this build. Keep any old test failure separate from the new run.

## Optional event evidence

Open this unpacked extension's **service worker → Inspect** from `chrome://extensions`.
Paste the contents of [META-AI-STEP3-PROBE.js](META-AI-STEP3-PROBE.js) into its Console.
For browser automation, evaluating the same file in the service-worker execution context
works too. Keep the Console open while operating the actual Side Panel.

The observer reads runtime events and Meta DOM metadata; it sends no prompts and changes
no page controls. It keeps times, local request/workflow IDs, character counts, readiness,
and Stop visibility. It does not collect prompt/response text, account data, cookies or storage.

Inspect progress with `metaStep3Probe.snapshot()`. After both cases below, export with:

```js
copy(JSON.stringify(await metaStep3Probe.stop(), null, 2))
```

Save the copied JSON beside the VM results, then close DevTools. Reloading the extension or
restarting its worker removes the observer; start it again if needed. At most 250 events
are retained; `droppedEvents` and `pendingSamples` disclose incomplete evidence.

## Case A — stream through final

Send this through the Side Panel:

```text
META-QC-FINAL
請用繁體中文列出 100 句簡短的休息建議，每句編號，勿合併。
首行保留：**測試 ✓** 與 `code`
```

Confirm the provider receives exactly one copy, including the separate lines and Unicode.
While Meta's Stop remains visible, confirm the extension transcript is already growing.
Let the response finish; compare the final transcript with the actual Meta answer and
confirm processing ends. Model formatting variation is not a capture failure.

The observer should show `RESPONSE_CHUNK` entries and a non-error `RESPONSE_DONE` for the
same request. `dom.stopVisible: true` on a chunk supports the streaming observation.
DOM sampling happens **after** receipt; `sampleDelayMs` records the gap. A false/missing
sample does not prove that Stop was absent when the chunk arrived. Record the visible UI
alongside this metadata, including whether the stream window was actually observed.

## Case B — stop an active stream

Send the same long prompt with the first line changed to `META-QC-STOP`. Once new text is
appearing and Meta's Stop is visible, click **Stop in the extension Side Panel**. Confirm
both extension processing and provider generation stop, and no later text is appended to
the cancelled extension response. Observe for another five seconds.

The observer records a `CANCEL_WORKFLOW` request; that event alone does not establish a
successful stop. A cancelled content request normally has no final `RESPONSE_DONE`.
If generation ended before the click, mark Stop `NOT_OBSERVED` and repeat this case.

## Return the result

```text
Marker: babysit-0621ET-multiext-a4c33e36
PR / tested full SHA: #42 / ...
VM / Chrome / extension ID / loaded dist: ...
Case A single send + multiline input: PASS | FAIL | BLOCKED
Case A chunks while Stop visible: PASS | FAIL | NOT_OBSERVED
Case A final matches provider + processing ends: PASS | FAIL | BLOCKED
Case B extension Stop stops provider + no late extension text: PASS | FAIL | NOT_OBSERVED
Exact UI error, if any: ...
Evidence: observer JSON path / cropped UI evidence / visible observations
Next: Step4–5 | diagnose ...
```

If send fails before a chunk, capture the exact UI error; do not mark capture or Stop passed.
If the page answers but the extension does not, the counts and event sequence help distinguish
selector/capture failure from completion waiting. `errorLike` flags `[Error:`-prefixed output
for inspection; it does not automatically classify the run. When Step3 passes, continue
[Step4 fanout/serial and Step5 Retry/Skip/Cancel](META-AI-SMOKE.md#manual-checks--pending-vm-01-through-vm-07)
with the other required providers ready.

## Desktop signed-in reply (2026-09-21)

The repository owner reported on 2026-09-21 that the sibling desktop app (`multi-ai-chat-desktop`) did receive Meta AI replies on a real signed-in meta.ai page. Build, platform and timestamp were not recorded. That is a desktop result, not a Chrome-extension pass, and no VM row here may be marked PASS because of it.

The desktop selector list, which this extension's list is a superset of, can match a real hydrated composer. It does not say which selector matched, so the broad fallback `[contenteditable="true"][role="textbox"]` must not be narrowed until the probe answers which `META_INPUT_SELECTORS` entry matches the composer (Q1), whether that composer sits inside `META_COMPOSER_CONTAINER` (Q2), and how many other `[contenteditable="true"][role="textbox"]` nodes are not the composer (Q3).

The upgraded [META-AI-STEP3-PROBE.js](META-AI-STEP3-PROBE.js) records exactly those three answers in one authenticated run: `matchedSelectors` and `container` on each visible composer, plus the `textboxes` census (`total`, `visible`, `usable`, `nonComposer`).

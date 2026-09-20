# Meta AI source-port validation

Meta AI support is experimental and unreleased. Selectors originate from
`multi-ai-chat-desktop/adapters/meta.json` (adapter v1). The desktop evidence covers a
logged-out DOM probe; it does not establish authenticated extension compatibility.

The default lineup remains ChatGPT, Claude, Gemini, and Grok. Settings can put one provider
on standby, leaving exactly four active. Existing browser tabs and login sessions are retained.
Unlike a desktop WebView, normal Chrome login navigation needs no extension permission on
Meta authentication, Facebook, or Instagram domains.

## Automated checks

Run `npm ci` followed by `npm run verify`. Tests cover enabled guest composers, inert/disabled
and hidden inputs, exact HTTPS Meta host recognition, all standby swaps, restored roles,
four-provider fanout through the real worker with mocked Chrome APIs, standby exclusion from
session reset/restore, workflow-time change rejection, and Meta roundtable recovery. The build
includes `content/meta.js` and the two exact Meta app host matches.

## Manual checks — pending

1. Load the built `dist/` directory as an unpacked extension. Existing v0.2.3 releases do not
   include this feature. Open all five provider tabs and confirm only the default four appear
   in the panel until Settings changes the standby provider.
2. Put Grok on standby, open Meta, and check its current guest/login state. A visible input
   behind an inert login overlay must show login required. An enabled guest composer can
   report ready. Complete whatever login Meta currently requires in the normal browser.
3. Send a harmless prompt, then a multiline prompt containing Unicode and Markdown. Confirm
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

Record Chrome/OS versions, date, region and guest/authenticated status with the result.
Do not attach account data, cookies, tokens or private conversations.

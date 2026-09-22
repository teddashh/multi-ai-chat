// Optional installed-extension fixture QA. All provider pages are intercepted.
// Requires a fresh disposable browser/profile; never connect to a personal browser.
//
// Meta's content script is not injected when this unpacked extension loads. It is
// registered only after the optional host permissions https://www.meta.ai/* and
// https://meta.ai/* are granted. chrome.permissions.request() always prompts for
// those optional origins and cannot grant them headlessly; do not stub the grant.
// Before running, grant both origins by hand in this disposable browser (open the
// extension, choose a standby provider other than Meta, and accept the meta.ai
// prompt). Declining keeps Meta on standby, so content/meta.js is not registered.
// See store/META-AI-SMOKE.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const output = path.resolve(process.env.EXTENSION_SMOKE_OUTPUT || '/tmp/multi-ai-extension-smoke');
const lexicalBundle = process.env.EXTENSION_SMOKE_LEXICAL_BUNDLE;
const editorKind = lexicalBundle ? 'lexical' : process.env.EXTENSION_SMOKE_EDITOR === 'textarea' ? 'textarea' : 'contenteditable';
const origins = new Set(['chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com', 'grok.com', 'www.meta.ai', 'meta.ai']);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function metaHtml(kind) {
  if (kind === 'login-wall') {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Meta AI fixture login wall</title>
<style>body{font:16px sans-serif}[role=dialog]{position:fixed;inset:0;background:#fff;padding:24px}</style></head>
<body>
  <textarea data-testid="composer-input" aria-label="Ask Meta AI">blocked</textarea>
  <div role="dialog" aria-modal="true">
    <p>Sign in to continue</p>
    <button data-testid="login-button">Log in</button>
  </div>
</body></html>`;
  }
  const editor = kind === 'textarea'
    ? '<textarea data-testid="composer-input" aria-label="Ask Meta AI"></textarea>'
    : '<div data-testid="composer-input" contenteditable="true" aria-label="Ask Meta AI" role="textbox"></div>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Meta AI fixture</title>
<style>
  body{font:16px sans-serif;margin:16px}
  [data-testid="composer-input"],button{display:block;width:480px;min-height:40px;margin:8px 0}
</style></head>
<body>
${editor}
<button data-testid="composer-send-button" aria-label="Send">Send</button>
<button data-testid="composer-stop-button" aria-label="Stop" hidden>Stop</button>
<div id="thread"></div>
<script>
window.__metaFixture = { prompts: [], stopped: false, sending: false, chunks: [] };
const input = document.querySelector('[data-testid="composer-input"]');
const send = document.querySelector('[data-testid="composer-send-button"]');
const stop = document.querySelector('[data-testid="composer-stop-button"]');
let timer;
function readPrompt() {
  return input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement
    ? input.value : (window.readModel ? window.readModel() : (input.textContent || ''));
}
function clearPrompt() {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) input.value = '';
  else if (window.seedModel) window.seedModel('');
  else input.textContent = '';
}
function startGeneration(prompt) {
  const text = String(prompt || '');
  if (!text.trim() || window.__metaFixture.sending) return;
  window.__metaFixture.prompts.push(text);
  window.__metaFixture.sending = true;
  window.__metaFixture.stopped = false;
  clearPrompt();
  send.hidden = true;
  stop.hidden = false;
  const user = document.createElement('div');
  user.setAttribute('data-user-message', '');
  user.textContent = text;
  document.getElementById('thread').appendChild(user);
  const answer = document.createElement('div');
  answer.setAttribute('data-testid', 'assistant-message');
  document.getElementById('thread').appendChild(answer);
  const stopRun = /META-QC-STOP/.test(text);
  window.__metaFixture.finish = () => { clearInterval(timer); stop.hidden = true; send.hidden = false; window.__metaFixture.sending = false; };
  const parts = stopRun
    ? ['Stop chunk 1', 'Stop chunk 1 and 2', 'Stop chunk 1 and 2 and 3', 'should not appear if stopped']
    : ['META-QC-ONE-CHUNK', 'META-QC-ONE-CHUNK META-QC-FINAL'];
  let index = 0;
  timer = setInterval(() => {
    if (window.__metaFixture.stopped) { clearInterval(timer); return; }
    const next = parts[Math.min(index, parts.length - 1)];
    answer.textContent = next;
    window.__metaFixture.chunks.push(next);
    index += 1;
    if (!stopRun && index >= parts.length) {
      clearInterval(timer);
      // Keep Stop visible until the test observes a real extension chunk.

    }
  }, 700);
}
if (${kind !== 'lexical'} && input && !(input instanceof HTMLTextAreaElement) && !(input instanceof HTMLInputElement)) {
  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
    input.textContent = text;
  });
}
send.addEventListener('click', () => startGeneration(readPrompt()));
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    startGeneration(readPrompt());
  }
});
stop.addEventListener('click', () => {
  window.__metaFixture.stopped = true;
  window.__metaFixture.sending = false;
  clearInterval(timer);
  stop.hidden = true;
  send.hidden = false;
});
</script></body></html>`;
}

function unreadyHtml(name) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${name} fixture unready</title></head>
<body><p>${name} controlled unready fixture. No live account.</p></body></html>`;
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const report = {
    status: 'RUNNING', recordedAt: new Date().toISOString(),
    evidence: 'Real unpacked extension and docked Side Panel with controlled provider pages. Not live-provider or authenticated VM evidence.',
    checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    hashes: Object.fromEntries(['manifest.json', 'background.js', 'sidepanel.js', 'content/meta.js'].map(file => [file, hash(path.join(dist, file))])),
    editorKind, lexicalBundleSHA256: lexicalBundle ? hash(lexicalBundle) : undefined,
    passed: [], errors: [],
    remaining: ['Live providers and multi-provider VM workflows/recovery', 'Full Chrome restart', 'OS IME and screen reader'],
  };
  const save = () => fs.writeFileSync(path.join(output, 'RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  save();
  let browser, context, profile, panel, bootstrap;
  const ownedPages = [];
  const external = Boolean(process.env.EXTENSION_SMOKE_CDP_URL);
  try {
    if (external) {
      browser = await chromium.connectOverCDP(process.env.EXTENSION_SMOKE_CDP_URL);
      context = browser.contexts()[0];
      assert.ok(context, 'Disposable CDP browser must have a persistent context with dist loaded');
    } else {
      profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mac-qc-'));
      context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium', executablePath: process.env.EXTENSION_SMOKE_BROWSER,
        headless: true, args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
      });
      browser = context.browser();
    }
    report.browser = browser?.version();
    context.setDefaultTimeout(15000);
    // This browser belongs exclusively to the fixture. Never forward provider requests.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:') return route.continue();
      if (!origins.has(url.hostname)) return route.abort();
      const body = ['www.meta.ai', 'meta.ai'].includes(url.hostname)
        ? metaHtml(url.searchParams.has('wall') ? 'login-wall' : editorKind)
        : unreadyHtml(url.hostname);
      return route.request().resourceType() === 'document'
        ? route.fulfill({ contentType: 'text/html', body }) : route.fulfill({ status: 204, body: '' });
    });
    // An idle MV3 worker may not have a target. chrome://extensions lists installed
    // extensions without assuming that an unrelated built-in worker is ours.
    const manager = await context.newPage(); ownedPages.push(manager);
    await manager.goto('chrome://extensions/');
    const installed = await manager.evaluate(() => new Promise(resolve => chrome.developerPrivate.getExtensionsInfo(
      { includeDisabled: true, includeTerminated: true }, items => resolve(items.map(({ id, name, state }) => ({ id, name, state }))),
    )));
    const extension = installed.find(item => item.name === 'Multi-AI Chat' && item.state === 'ENABLED');
    assert.ok(extension, 'The rebuilt dist must be loaded and enabled in this disposable browser');
    report.extensionId = extension.id;
    await manager.close();
    const panelUrl = `chrome-extension://${extension.id}/sidepanel.html`;
    const openPanel = async () => {
      bootstrap = await context.newPage(); ownedPages.push(bootstrap);
      bootstrap.on('pageerror', error => report.errors.push(error.message));
      await bootstrap.goto(panelUrl);
      await bootstrap.evaluate(async () => {
        const { id } = await chrome.windows.getCurrent();
        const button = document.createElement('button');
        button.textContent = 'QA open actual Side Panel';
        button.onclick = () => chrome.sidePanel.open({ windowId: id })
          .then(() => { window.qaPanelOpened = true; }, error => { window.qaPanelError = String(error); });
        document.body.prepend(button);
      });
      // A trusted click satisfies sidePanel.open's gesture requirement. Commands
      // below must originate from the resulting Side Panel, never the bootstrap tab.
      await bootstrap.getByText('QA open actual Side Panel', { exact: true }).click();
      await bootstrap.waitForFunction(() => window.qaPanelOpened || window.qaPanelError);
      assert.equal(await bootstrap.evaluate(() => window.qaPanelError), undefined);
      let actual;
      for (let attempt = 0; attempt < 100 && !actual; attempt++) {
        actual = context.pages().find(page => page !== bootstrap && !page.isClosed() && page.url() === panelUrl);
        if (!actual) await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.ok(actual, 'The docked Side Panel must be exposed as a page; no extension-tab fallback');
      ownedPages.push(actual);
      actual.on('pageerror', error => report.errors.push(error.message));
      await actual.getByRole('textbox', { name: 'Message to selected AIs', exact: true }).waitFor();
      await bootstrap.close();
      return actual;
    };
    panel = await openPanel();
    const stored = () => panel.evaluate(() => chrome.storage.local.get(['standbyProvider', 'freeTargets', 'conversations', 'activeConversationId']));
    const initial = await stored();
    assert.ok(!initial.standbyProvider || initial.standbyProvider === 'meta', 'Start from a fresh disposable profile, with Meta on standby');
    const targets = () => panel.getByRole('group', { name: 'Send to', exact: true });
    const selected = () => targets().getByRole('button', { pressed: true }).allTextContents();
    assert.deepEqual(await selected(), ['ChatGPT', 'Claude', 'Gemini', 'Grok']);
    report.passed.push('Actual Side Panel loads with the original four selected and Meta on standby');
    const optionalOrigins = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8')).optional_host_permissions;
    const metaAccessGranted = await panel.evaluate(async (origins) => chrome.permissions.contains({ origins }), optionalOrigins);
    assert.equal(
      metaAccessGranted,
      true,
      `Grant optional host access by hand before this run (${Array.isArray(optionalOrigins) ? optionalOrigins.join(', ') : 'https://www.meta.ai/* and https://meta.ai/*'}). `
      + 'content/meta.js is registered only after that grant. This runner cannot accept the permission prompt headlessly. '
      + 'Declining keeps Meta on standby.',
    );
    const standby = async provider => {
      await panel.getByRole('button', { name: 'Settings', exact: true }).click();
      const dialog = panel.getByRole('dialog');
      await dialog.locator('#standby-provider').selectOption(provider);
      await panel.waitForFunction(provider => chrome.storage.local.get('standbyProvider').then(s => s.standbyProvider === provider), provider);
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    };
    await standby('grok');
    assert.deepEqual(await selected(), ['ChatGPT', 'Claude', 'Gemini', 'Meta AI']);
    report.passed.push('Settings swaps standby through the real worker; no storage write bypass');
    const meta = await context.newPage(); ownedPages.push(meta);
    meta.on('pageerror', error => report.errors.push(error.message));
    const waitMetaStatus = status => panel.waitForFunction(status => chrome.runtime.sendMessage({ action: 'GET_CONNECTIONS' })
      .then(connections => connections.meta.status === status), status);
    await meta.goto('https://www.meta.ai/?wall=1');
    await waitMetaStatus('login-required');
    await meta.goto('https://www.meta.ai/');
    if (lexicalBundle) {
      await meta.addScriptTag({ path: lexicalBundle });
      await meta.evaluate(() => window.mountLexical(document.querySelector('[data-testid="composer-input"]')));
    }
    await waitMetaStatus('connected');
    report.passed.push('Meta login wall then usable composer update Ready through native content-script transport');
    await panel.getByRole('button', { name: 'Debate', exact: true }).click();
    for (const name of ['ChatGPT', 'Claude', 'Gemini']) assert.ok((await panel.locator('#input-readiness').innerText()).includes(name));
    assert.equal(await panel.locator('textarea').isDisabled(), true);
    await panel.getByRole('button', { name: 'Open unready AIs', exact: true }).click();
    await panel.getByRole('button', { name: 'Open unready AIs', exact: true }).waitFor();
    const openedHosts = [];
    for (const page of context.pages()) {
      try { openedHosts.push(new URL(page.url()).hostname); } catch { openedHosts.push(''); }
    }
    for (const host of ['chatgpt.com', 'claude.ai', 'gemini.google.com']) {
      assert.ok(openedHosts.some(opened => opened === host), `expected an opened tab for ${host}`);
    }
    assert.equal(openedHosts.some(opened => opened === 'grok.com' || opened === 'www.grok.com'), false);
    await panel.getByRole('button', { name: 'Free', exact: true }).click();
    await panel.getByRole('button', { name: 'Select ready AIs only', exact: true }).click();
    assert.deepEqual(await selected(), ['Meta AI']);
    await panel.locator('#input-readiness').waitFor({ state: 'detached' });
    report.passed.push('Named blockers, real Open unready tabs, and ready-only selection respect standby');
    const send = async prompt => {
      await panel.locator('textarea').fill(prompt);
      await panel.getByRole('button', { name: 'Send', exact: true }).click();
    };
    const prompt = 'META-QC-ONE\n\n繁體中文 ✓ 日本語 한국어\n**bold** `code` 👩‍💻 café é';
    await send(prompt);
    await meta.waitForFunction(() => window.__metaFixture.prompts.length === 1);
    assert.deepEqual(await meta.evaluate(() => window.__metaFixture.prompts), [prompt]);
    await panel.getByText('META-QC-ONE-CHUNK META-QC-FINAL', { exact: true }).waitFor();
    assert.equal(await meta.locator('[data-testid="composer-stop-button"]').isVisible(), true);
    assert.equal(await panel.getByRole('button', { name: 'Stop', exact: true }).isVisible(), true);
    await meta.evaluate(() => window.__metaFixture.finish());
    await panel.getByRole('button', { name: 'Stop', exact: true }).waitFor({ state: 'detached', timeout: 20000 });
    assert.ok((await stored()).conversations?.length);
    report.passed.push('Exact Unicode/multiline dispatch, Side Panel chunks while site Stop remains visible, then final completion');
    await send('META-QC-STOP keep generating');
    await meta.waitForFunction(() => window.__metaFixture.prompts.length === 2 && window.__metaFixture.chunks.includes('Stop chunk 1'));
    await panel.getByRole('button', { name: 'Stop', exact: true }).click();
    await meta.waitForFunction(() => window.__metaFixture.stopped);
    assert.equal(await meta.locator('[data-testid="composer-stop-button"]').isVisible(), false);
    report.passed.push('Side Panel Stop cancels the worker request and clicks the real content-script fixture Stop');
    await panel.close();
    panel = await openPanel();
    assert.deepEqual(await selected(), ['Meta AI']);
    assert.equal((await stored()).standbyProvider, 'grok');
    await panel.getByText('META-QC-ONE-CHUNK META-QC-FINAL', { exact: true }).waitFor();
    report.passed.push('Closing/reopening the real Side Panel preserves standby, selected targets and the finished transcript');
    await panel.getByRole('button', { name: 'Settings', exact: true }).click();
    await panel.locator('#hackmd-token').fill('fixture-token-not-a-credential');
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await panel.getByRole('dialog').waitFor({ state: 'detached' });
    await panel.getByRole('button', { name: 'Settings', exact: true }).click();
    await panel.waitForFunction(() => document.querySelector('#hackmd-token')?.value === 'fixture-token-not-a-credential');
    await panel.getByRole('button', { name: 'Clear token', exact: true }).click();
    await panel.waitForFunction(() => document.querySelector('#hackmd-token')?.value === '');
    await panel.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    report.passed.push('Settings Save/reopen/Clear completes through real chrome.storage with fixture-only token text');
    const session = await browser.newBrowserCDPSession();
    const { targetInfos } = await session.send('Target.getTargets');
    const worker = targetInfos.find(target => target.type === 'service_worker' && target.url === `chrome-extension://${extension.id}/background.js`);
    assert.ok(worker);
    await session.send('Target.closeTarget', { targetId: worker.targetId });
    await waitMetaStatus('connected');
    assert.equal((await stored()).standbyProvider, 'grok');
    assert.deepEqual((await stored()).freeTargets, ['meta']);
    report.passed.push('MV3 worker termination/restart retains real stored standby/targets and reconnects Meta');
    await standby('meta');
    assert.equal(await targets().getByRole('button', { name: 'Meta AI', exact: true }).count(), 0);
    assert.equal(await targets().getByRole('button', { name: 'Grok', exact: true }).count(), 1);
    report.passed.push('Switching Meta back to standby restores the original four active providers');
    await panel.screenshot({ path: path.join(output, 'final-sidepanel.png') });
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.errors.push(error.stack || String(error)); throw error;
  } finally {
    save();
    if (external) {
      for (const page of ownedPages.reverse()) if (!page.isClosed()) await page.close().catch(() => {});
      await context?.unrouteAll({ behavior: 'ignoreErrors' });
    } else {
      await context?.close();
      if (profile) fs.rmSync(profile, { recursive: true, force: true });
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
run().then(() => process.exit(0), error => { console.error(error); process.exit(1); });

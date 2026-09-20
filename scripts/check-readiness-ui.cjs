// Optional DOM integration check. Uses the production panel with a Chrome API
// double in an isolated browser context; never runs against a provider account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const origin = 'https://readiness.test';
const providers = ['chatgpt', 'claude', 'gemini', 'grok', 'meta'];
const output = path.resolve(process.env.READINESS_OUTPUT || '/tmp/multi-ai-readiness-ui');
const states = (ready) => Object.fromEntries(providers.map(provider => [provider, {
  provider, status: ready.includes(provider) ? 'connected' : 'disconnected',
}]));

function installChromeDouble({ seed, initialConnections }) {
  const key = 'readiness-fixture-storage';
  const read = () => JSON.parse(localStorage.getItem(key) || JSON.stringify(seed));
  const write = (values) => localStorage.setItem(key, JSON.stringify({ ...read(), ...values }));
  const listeners = new Set();
  let pending = [];
  window.readinessFixture = {
    connections: initialConnections, requests: [], scope: undefined,
    emit(message) { for (const listener of listeners) listener(message); },
    setConnections(connections) {
      this.connections = connections;
      this.emit({ action: 'CONNECTIONS_UPDATE', payload: connections });
    },
    finishOpening(failures = []) {
      const batch = pending;
      pending = [];
      for (const { provider, resolve } of batch) resolve(failures.includes(provider)
        ? { ok: false, error: 'Simulated tab open failure' } : { ok: true });
    },
    workflow(done = false) {
      this.emit({ action: 'WORKFLOW_STATUS', payload: {
        ...this.scope, workflowId: 'readiness-fixture-workflow',
        key: done ? '' : 'workflow.starting', done, cancelled: done,
      } });
    },
    stored: read,
  };
  window.chrome = {
    storage: { local: {
      get(keys, callback) {
        const values = read();
        const result = Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, values[key]]));
        if (callback) queueMicrotask(() => callback(result));
        return Promise.resolve(result);
      },
      set(values) { write(values); return Promise.resolve(); },
      remove(key) { const values = read(); delete values[key]; localStorage.setItem('readiness-fixture-storage', JSON.stringify(values)); return Promise.resolve(); },
    } },
    runtime: {
      onMessage: { addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener) },
      connect: () => ({ onDisconnect: { addListener() {} }, postMessage() {}, disconnect() {} }),
      sendMessage(message, callback) {
        const fixture = window.readinessFixture;
        fixture.requests.push({ action: message.action, provider: message.provider });
        let result;
        if (message.action === 'GET_CONNECTIONS') {
          fixture.scope = message.payload;
          result = fixture.connections;
        } else if (message.action === 'OPEN_LOGIN') {
          return new Promise(resolve => pending.push({ provider: message.provider, resolve }));
        } else if (message.action === 'GET_PROVIDER_URLS') result = {};
        else throw new Error(`Unexpected runtime action: ${message.action}`);
        if (callback) queueMicrotask(() => callback(result));
        return Promise.resolve(result);
      },
    },
  };
}

async function run(browser) {
  const { t, SUPPORTED_LOCALES } = await import(pathToFileURL(path.join(root, 'src/shared/i18n.ts')));
  fs.mkdirSync(output, { recursive: true });
  const report = {
    status: 'RUNNING', recordedAt: new Date().toISOString(),
    evidence: 'Production dist DOM + simulated Chrome runtime/storage. Not an installed extension or authenticated VM pass.',
    checkoutCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    bundleSHA256: createHash('sha256').update(fs.readFileSync(path.join(root, 'dist/sidepanel.js'))).digest('hex'),
    browser: browser.version(), vmResult: 'NOT_RUN: this runner uses simulated Chrome APIs',
    locales: [], errors: [],
  };
  const saveReport = () => fs.writeFileSync(path.join(output, 'RESULTS.json'), JSON.stringify(report, null, 2) + '\n');
  saveReport();
  for (const language of SUPPORTED_LOCALES) {
    const context = await browser.newContext({ viewport: { width: 420, height: 850 } });
    const passed = [];
    report.locales.push({ language, passed });
    try {
      const assets = {
        '/sidepanel.html': ['text/html', 'sidepanel.html'],
        '/sidepanel.js': ['application/javascript', 'sidepanel.js'],
        '/sidepanel.css': ['text/css', 'sidepanel.css'],
      };
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        const asset = url.origin === origin && assets[url.pathname];
        return asset ? route.fulfill({ contentType: asset[0], body: fs.readFileSync(path.join(root, 'dist', asset[1])) }) : route.abort();
      });
      await context.addInitScript(installChromeDouble, {
        seed: { language, standbyProvider: 'grok', freeTargets: ['chatgpt', 'claude', 'gemini', 'meta'] },
        initialConnections: states(['meta', 'grok']), // Ready standby must remain excluded.
      });
      const createPanel = async () => {
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(`${language}: ${error.message}`));
        await page.goto(`${origin}/sidepanel.html`);
        await page.waitForFunction(() => window.readinessFixture.scope);
        return page;
      };
      let page = await createPanel();
      const label = key => t(key, undefined, language);
      const button = key => page.getByRole('button', { name: label(key), exact: true });
      const mode = name => page.getByRole('button', { name: new RegExp(`${label(`mode.${name}`)}$`) });
      const expectNotice = async text => page.waitForFunction(text => document.querySelector('#input-readiness')?.textContent === text, text);
      const expectSelected = async names => page.waitForFunction(names =>
        JSON.stringify([...document.querySelectorAll('button[aria-pressed="true"]')].map(button => button.textContent)) === JSON.stringify(names), names);
      await expectNotice(t('input.readiness.partial', { ready: 'Meta AI', providers: 'ChatGPT · Claude · Gemini' }, language));
      assert.equal(await page.locator('textarea').isEnabled(), true);
      for (const name of ['debate', 'consult']) {
        await mode(name).click();
        await expectNotice(t('error.providers_not_ready', { providers: 'ChatGPT · Claude · Gemini' }, language));
        assert.equal(await page.locator('textarea').isDisabled(), true);
        assert.equal(await button('connection.open_unready').isEnabled(), true);
        assert.equal(await button('targets.select_ready').count(), 0);
      }
      passed.push('Free partial and Debate/Consult blockers name only the three unready active providers');
      await mode('free').click();
      await button('connection.open_unready').click();
      assert.equal(await button('connection.opening').isDisabled(), true);
      const opened = () => page.evaluate(() => window.readinessFixture.requests.filter(r => r.action === 'OPEN_LOGIN').map(r => r.provider));
      assert.deepEqual(await opened(), ['chatgpt', 'claude', 'gemini']);
      await page.evaluate(() => window.readinessFixture.finishOpening(['claude']));
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('alert').innerText(), t('error.open_unready_failed', { providers: 'Claude' }, language));
      await button('connection.open_unready').click();
      assert.deepEqual(await opened(), ['chatgpt', 'claude', 'gemini', 'chatgpt', 'claude', 'gemini']);
      await page.evaluate(() => window.readinessFixture.finishOpening());
      await button('connection.open_unready').waitFor();
      await page.getByRole('alert').waitFor({ state: 'detached' });
      await expectNotice(t('input.readiness.partial', { ready: 'Meta AI', providers: 'ChatGPT · Claude · Gemini' }, language));
      passed.push('Open shortcut sends exact OPEN_LOGIN requests, stays disabled pending, reports/retries individual failure without claiming Ready');
      for (const viewport of [{ width: 320, height: 600 }, { width: 420, height: 850 }]) {
        await page.setViewportSize(viewport);
        const bounds = await button('input.send').boundingBox();
        assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height, `${language}: Send must fit ${viewport.width}x${viewport.height}`);
      }
      passed.push('Send remains fully visible with the unreadiness hint at 320x600 and 420x850');
      if (language === 'zh-TW') await page.screenshot({ path: path.join(output, 'zh-TW-partial.png') });
      await button('targets.select_ready').click();
      await expectSelected(['Meta AI']);
      await page.locator('#input-readiness').waitFor({ state: 'detached' });
      assert.equal(await button('connection.open_unready').count(), 0);
      await page.waitForFunction(() => JSON.stringify(window.readinessFixture.stored().freeTargets) === '["meta"]');
      // Destroy the entire page/React tree, then hydrate a fresh page from saved storage.
      await page.close();
      page = await createPanel();
      assert.equal(await button('targets.select_ready').count(), 1, `Reopen mode: ${await page.evaluate(() => JSON.stringify(window.readinessFixture.stored().conversations?.map(c => c.mode)))}`);
      await expectSelected(['Meta AI']);
      assert.equal(await page.locator('#input-readiness').count(), 0);
      passed.push('Ready-only selects Meta, excludes Ready standby Grok, clears hint, and survives actual page close/reopen');
      if (language === 'zh-TW') await page.screenshot({ path: path.join(output, 'zh-TW-reopened.png') });
      await page.evaluate(connections => window.readinessFixture.setConnections(connections), states(['chatgpt', 'meta', 'grok']));
      await expectSelected(['Meta AI']);
      await button('targets.select_ready').click();
      await expectSelected(['ChatGPT', 'Meta AI']);
      await page.evaluate(connections => window.readinessFixture.setConnections(connections), states([]));
      await page.waitForFunction(() => document.querySelector('textarea').disabled);
      assert.equal(await button('targets.select_ready').isDisabled(), true);
      await expectSelected(['ChatGPT', 'Meta AI']);
      await page.evaluate(connections => window.readinessFixture.setConnections(connections), states(providers));
      await page.waitForFunction(() => !document.querySelector('textarea').disabled);
      await page.evaluate(() => window.readinessFixture.workflow());
      await page.waitForFunction(() => document.querySelector('textarea').disabled);
      assert.equal(await button('targets.select_ready').isDisabled(), true);
      await page.evaluate(() => window.readinessFixture.workflow(true));
      await page.waitForFunction(() => !document.querySelector('textarea').disabled);
      passed.push('Readiness changes do not silently change selection; zero Ready and active workflow disable shortcut');
      const requests = await page.evaluate(() => window.readinessFixture.requests);
      assert.equal(requests.some(request => request.action === 'SEND_MESSAGE'), false);
    } catch (error) {
      report.status = 'FAIL';
      report.errors.push(`${language}: ${error.message}`);
      throw error;
    } finally { await context.close(); saveReport(); }
  }
  report.status = report.errors.length ? 'FAIL' : 'PASS';
  saveReport();
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
}

(async () => {
  const connected = Boolean(process.env.READINESS_CDP_URL);
  const browser = connected
    ? await chromium.connectOverCDP(process.env.READINESS_CDP_URL)
    : await chromium.launch({ headless: true, executablePath: process.env.READINESS_BROWSER });
  try { await run(browser); }
  finally {
    // Only our contexts are closed above. Never close a shared CDP browser.
    if (!connected) await browser.close();
  }
})().then(() => process.exit(0), error => { console.error(error); process.exit(1); });

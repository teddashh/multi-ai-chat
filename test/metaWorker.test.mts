import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { ALL_PROVIDERS, activeProviders } from '../src/shared/providerSelection.ts';
import { AI_PROVIDERS } from '../src/shared/constants.ts';

// Run the actual service worker against a Chrome transport double. Transpile its
// extensionless browser imports without changing production module resolution.
function worker(stored: Record<string, unknown> = {}, autoRespond = true) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const sent: any[] = [];
  const navigated: number[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const local = { ...stored };
  const session: Record<string, unknown> = {};
  const tabs = ALL_PROVIDERS.map((provider, index) => ({ id: index + 1, url: AI_PROVIDERS[provider].url }));
  function event() {
    return { listeners: [] as Function[], addListener(listener: Function) { this.listeners.push(listener); } };
  }
  function storage(values: Record<string, unknown>) {
    return {
      get: async (keys: string | string[]) => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, values[key]])),
      set: async (updates: Record<string, unknown>) => { Object.assign(values, updates); },
      remove: async (key: string) => { delete values[key]; },
      setAccessLevel: async () => {},
    };
  }
  const chrome = {
    sidePanel: { setPanelBehavior: async () => {} },
    storage: { local: storage(local), session: storage(session) },
    runtime: {
      onMessage: event(), onConnect: event(), onInstalled: event(), onStartup: event(),
      sendMessage: async () => {},
    },
    tabs: {
      onUpdated: event(), onRemoved: event(),
      query: async () => tabs,
      get: async (id: number) => tabs.find((tab) => tab.id === id),
      create: async () => {},
      update: async (id: number) => { navigated.push(id); return tabs.find((tab) => tab.id === id); },
      sendMessage: async (id: number, message: any) => {
        if (message.action === 'CHECK_STATUS') {
          receive({ action: 'STATUS_REPORT', provider: message.provider, payload: { loggedIn: true } }, { tab: tabs.find((tab) => tab.id === id) });
        }
        if (message.action === 'SEND_MESSAGE') {
          sent.push({ ...message, tabId: id });
          if (autoRespond) complete(sent.at(-1));
        }
        return { ok: true };
      },
    },
    windows: { update: async () => {} },
    scripting: { executeScript: async () => {} },
  };
  function receive(message: any, sender: any = {}, reply: Function = () => {}) {
    return chrome.runtime.onMessage.listeners[0](message, sender, reply);
  }
  function command(message: any, sender: any = {}): Promise<any> {
    return new Promise((resolve) => receive(message, sender, resolve));
  }
  function complete(message: any) {
    receive({ ...message, action: 'RESPONSE_DONE', payload: 'answer' }, { tab: tabs.find((tab) => tab.id === message.tabId) });
  }
  const context = vm.createContext({
    chrome, console, URL, DOMException, crypto, TextEncoder,
    setTimeout: (...args: Parameters<typeof setTimeout>) => {
      const timer = setTimeout(...args);
      timers.add(timer);
      return timer;
    },
    clearTimeout,
  });
  const cache = new Map<string, { exports: unknown }>();
  function load(file: string): unknown {
    if (cache.has(file)) return cache.get(file)!.exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const run = vm.runInContext(`(function(require, module, exports) {${code}\n})`, context, { filename: file });
    run((relative: string) => load(path.resolve(path.dirname(file), `${relative}.ts`)), module, module.exports);
    return module.exports;
  }
  load(path.join(root, 'src/background/service-worker.ts'));
  const ready = new Promise<void>((resolve) => setImmediate(resolve));
  return {
    command, sent, local, navigated, ready, complete,
    close: () => { for (const timer of timers) clearTimeout(timer); },
    send: (mode = 'free', targets?: string[]) => command({ action: 'SEND_MESSAGE', payload: {
      workflowId: crypto.randomUUID(), sessionId: 'session', clientId: 'client', text: 'Hello', mode, targets,
    } }),
  };
}

test('worker default fanout excludes Meta even with all five tabs connected', async (t) => {
  const app = worker();
  t.after(app.close);
  await app.ready;
  assert.equal((await app.send('free', ALL_PROVIDERS)).ok, true);
  assert.deepEqual(app.sent.map((message) => message.provider), activeProviders('meta'));
  assert.equal((await app.command({ action: 'OPEN_LOGIN', provider: 'meta' })).ok, false);
});

test('worker swaps Meta into fanout and leaves standby tabs untouched during session restore/reset', async (t) => {
  const app = worker({ freeTargets: activeProviders('meta') });
  t.after(app.close);
  await app.ready;
  const result = await app.command({ action: 'SET_STANDBY_PROVIDER', payload: { standbyProvider: 'grok' } });
  assert.equal(result.ok, true);
  assert.equal(app.local.standbyProvider, 'grok');
  assert.deepEqual(Array.from(result.freeTargets), ['chatgpt', 'claude', 'gemini', 'meta']);
  await app.send('free', ALL_PROVIDERS);
  assert.deepEqual(app.sent.map((message) => message.provider), activeProviders('grok'));
  await app.command({ action: 'RESET_PROVIDER_SESSIONS' });
  assert.deepEqual(app.navigated, [1, 2, 3, 5]);
  await app.command({ action: 'RESTORE_PROVIDER_SESSIONS', payload: {
    urls: { grok: 'https://grok.com/chat/old', meta: 'https://www.meta.ai/prompt/current' },
  } });
  assert.deepEqual(app.navigated, [1, 2, 3, 5, 5]);
  assert.equal((await app.command({ action: 'OPEN_LOGIN', provider: 'grok' })).ok, false);
});

test('worker restores standby at startup and repairs default Coding roles before sending', async (t) => {
  const app = worker({ standbyProvider: 'grok' });
  t.after(app.close);
  await app.ready;
  await app.send('coding');
  assert.deepEqual(app.sent.map((message) => message.provider), [
    'gemini', 'chatgpt', 'claude', 'chatgpt', 'meta', 'claude', 'gemini', 'claude',
  ]);
});

test('provider selection rejects content-script requests and changes during an active workflow', async (t) => {
  const app = worker({}, false);
  t.after(app.close);
  await app.ready;
  const change = { action: 'SET_STANDBY_PROVIDER', payload: { standbyProvider: 'grok' } };
  assert.equal((await app.command(change, { tab: { id: 5 } })).ok, false);
  const running = app.send();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(app.sent.length, 4);
  assert.equal((await app.command(change)).ok, false);
  for (const message of app.sent) app.complete(message);
  await running;
  assert.equal((await app.command(change)).ok, true);
});

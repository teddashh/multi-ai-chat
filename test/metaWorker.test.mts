import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { ALL_PROVIDERS, activeProviders } from '../src/shared/providerSelection.ts';
import { AI_PROVIDERS } from '../src/shared/constants.ts';
import type { AIProvider } from '../src/shared/types.ts';
import { decodeError } from '../src/shared/errors.ts';
import { openUnreadyProviders } from '../src/sidepanel/openUnreadyProviders.ts';

// Run the actual service worker against a Chrome transport double. Transpile its
// extensionless browser imports without changing production module resolution.
function worker(stored: Record<string, unknown> = {}, autoRespond = true, readiness: Partial<Record<AIProvider, boolean | null>> = {}, missingTabs: AIProvider[] = []) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const sent: any[] = [];
  const broadcasts: any[] = [];
  const navigated: number[] = [];
  const created: { url: string }[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const local = { ...stored };
  const session: Record<string, unknown> = {};
  const tabs = ALL_PROVIDERS.flatMap((provider, index) => missingTabs.includes(provider) ? [] : [{ id: index + 1, url: AI_PROVIDERS[provider].url }]);
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
      sendMessage: async (message: any) => { broadcasts.push(message); },
    },
    tabs: {
      onUpdated: event(), onRemoved: event(),
      query: async () => tabs,
      get: async (id: number) => tabs.find((tab) => tab.id === id),
      create: async (options: { url: string }) => { created.push(options); },
      update: async (id: number) => { navigated.push(id); return tabs.find((tab) => tab.id === id); },
      sendMessage: async (id: number, message: any) => {
        if (message.action === 'CHECK_STATUS') {
          const provider = message.provider as AIProvider;
          receive({ action: 'STATUS_REPORT', provider, payload: { loggedIn: provider in readiness ? readiness[provider] : true } }, { tab: tabs.find((tab) => tab.id === id) });
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
    command, sent, broadcasts, local, navigated, created, ready, complete,
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

test('Free worker sends only to Ready targets and records every selected unready display name', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, true, { chatgpt: false, claude: null, gemini: false });
  t.after(app.close);
  await app.ready;
  await app.send('free', ALL_PROVIDERS);
  assert.deepEqual(app.sent.map((message) => message.provider), ['meta']);
  const status = app.broadcasts.find((message) => message.payload?.key === 'workflow.free.partial');
  assert.equal(status?.payload.params.ready, 'Meta AI');
  assert.equal(status?.payload.params.providers, 'ChatGPT · Claude · Gemini');
  assert.equal(app.broadcasts.some((message) => message.provider === 'system'), false);
  assert.ok(app.broadcasts.some((message) => message.payload?.done === true));
});

test('Free worker names only the unready targets when a different provider is Ready', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, true, { chatgpt: false, claude: false });
  t.after(app.close);
  await app.ready;
  await app.send('free', ['claude', 'chatgpt', 'claude']);
  assert.equal(app.sent.length, 0);
  const error = app.broadcasts.find((message) => message.provider === 'system');
  assert.deepEqual(decodeError(error?.payload), {
    key: 'error.providers_not_ready', params: { providers: 'Claude · ChatGPT' },
  });
  assert.ok(app.broadcasts.some((message) => message.payload?.done === true));
});

test('Free worker does not warn about unselected or standby providers', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, true, { chatgpt: false, claude: false, gemini: false });
  t.after(app.close);
  await app.ready;
  await app.send('free', ['meta', 'grok']);
  assert.deepEqual(app.sent.map((message) => message.provider), ['meta']);
  assert.equal(app.broadcasts.some((message) => message.payload?.key === 'workflow.free.partial'), false);
  const status = app.broadcasts.find((message) => message.payload?.key === 'workflow.free');
  assert.equal(status?.payload.params.providers, 'Meta AI');
});

test('Free worker distinguishes an empty selection from providers that are not Ready', async (t) => {
  const app = worker();
  t.after(app.close);
  await app.ready;
  await app.send('free', []);
  assert.equal(app.sent.length, 0);
  const error = app.broadcasts.find((message) => message.provider === 'system');
  assert.equal(decodeError(error?.payload)?.key, 'error.no_selection');
});

test('shortcut uses OPEN_LOGIN to focus existing unready tabs without opening standby or Ready tabs', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, true, { chatgpt: false, claude: null, gemini: false });
  t.after(app.close);
  await app.ready;
  const failed = await openUnreadyProviders(ALL_PROVIDERS, 'grok', await app.command({ action: 'GET_CONNECTIONS' }), async (provider) => {
    assert.equal((await app.command({ action: 'OPEN_LOGIN', provider })).ok, true);
  });
  assert.deepEqual(failed, []);
  assert.deepEqual(app.navigated, [1, 2, 3]);
  assert.deepEqual(app.created, []);
  assert.equal(app.sent.length, 0);
});

test('shortcut opens a missing selected tab through the existing login URL', async (t) => {
  const app = worker({}, true, {}, ['grok']);
  t.after(app.close);
  await app.ready;
  const failed = await openUnreadyProviders(['chatgpt', 'grok', 'grok', 'meta'], 'meta', await app.command({ action: 'GET_CONNECTIONS' }), async (provider) => {
    assert.equal((await app.command({ action: 'OPEN_LOGIN', provider })).ok, true);
  });
  assert.deepEqual(failed, []);
  assert.deepEqual(app.navigated, []);
  assert.deepEqual(app.created.map((tab) => tab.url), [AI_PROVIDERS.grok.loginUrl]);
});

test('worker still rejects a provider that became standby after the shortcut snapshot', async (t) => {
  const app = worker({}, true, { grok: false });
  t.after(app.close);
  await app.ready;
  const connections = await app.command({ action: 'GET_CONNECTIONS' });
  assert.equal((await app.command({ action: 'SET_STANDBY_PROVIDER', payload: { standbyProvider: 'grok' } })).ok, true);
  const failed = await openUnreadyProviders(['grok'], 'meta', connections, async (provider) => {
    const result = await app.command({ action: 'OPEN_LOGIN', provider });
    if (!result.ok) throw new Error(result.error);
  });
  assert.deepEqual(failed, ['grok']);
  assert.deepEqual(app.navigated, []);
  assert.deepEqual(app.created, []);
});

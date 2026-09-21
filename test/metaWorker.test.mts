import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { ALL_PROVIDERS, activeProviders, readyActiveTargets } from '../src/shared/providerSelection.ts';
import { AI_PROVIDERS } from '../src/shared/constants.ts';
import type { AIProvider, ConsultRoles, DebateRoles, RoundtableRoles } from '../src/shared/types.ts';
import { decodeError } from '../src/shared/errors.ts';
import { openUnreadyProviders } from '../src/sidepanel/openUnreadyProviders.ts';

const META_DEBATE: DebateRoles = { pro: 'meta', con: 'chatgpt', judge: 'claude', summary: 'gemini' };
const META_CONSULT: ConsultRoles = { first: 'meta', second: 'chatgpt', reviewer: 'claude', summary: 'gemini' };
const META_ROUNDTABLE: RoundtableRoles = { first: 'meta', second: 'chatgpt', third: 'claude', fourth: 'gemini' };

async function waitUntil(predicate: () => boolean, label: string, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setImmediate(resolve));
  }
}

async function completeRemaining(app: ReturnType<typeof worker>, running: Promise<unknown>): Promise<unknown> {
  const completed = new Set<string>();
  const start = Date.now();
  let settled = false;
  const finished = Promise.resolve(running).then((value) => {
    settled = true;
    return value;
  });
  while (!settled) {
    if (Date.now() - start > 5000) {
      throw new Error(`did not finish workflow: sent=${app.sent.length} completed=${completed.size}`);
    }
    for (const message of app.sent) {
      if (!message.requestId || completed.has(message.requestId)) continue;
      completed.add(message.requestId);
      app.complete(message);
    }
    await Promise.race([finished, new Promise((resolve) => setImmediate(resolve))]);
  }
  return finished;
}

// Run the actual service worker against a Chrome transport double. Transpile its
// extensionless browser imports without changing production module resolution.
function worker(
  stored: Record<string, unknown> = {},
  autoRespond = true,
  readiness: Partial<Record<AIProvider, boolean | null>> = {},
  missingTabs: AIProvider[] = [],
  extras: { session?: Record<string, unknown>; rejectSend?: AIProvider[] } = {},
) {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const sent: any[] = [];
  const stops: any[] = [];
  const broadcasts: any[] = [];
  const navigated: number[] = [];
  const created: { url: string }[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const local = { ...stored };
  const session: Record<string, unknown> = { ...extras.session };
  const rejectSend = extras.rejectSend ?? [];
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
          if (rejectSend.includes(message.provider)) return { ok: false, error: 'already responding' };
          if (autoRespond) complete(sent.at(-1));
        }
        if (message.action === 'STOP_GENERATION') stops.push({ ...message, tabId: id });
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
  function complete(message: any, payload = 'answer') {
    receive({ ...message, action: 'RESPONSE_DONE', payload }, { tab: tabs.find((tab) => tab.id === message.tabId) });
  }
  function fail(message: any, payload = '[Error: quota]') {
    complete(message, payload);
  }
  function removeTab(tabId: number) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index >= 0) tabs.splice(index, 1);
    for (const listener of chrome.tabs.onRemoved.listeners) listener(tabId);
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
    command, sent, stops, broadcasts, local, session, navigated, created, ready, complete, fail, removeTab,
    close: () => { for (const timer of timers) clearTimeout(timer); },
    send: (mode = 'free', targets?: string[], options: {
      roles?: DebateRoles | ConsultRoles | RoundtableRoles;
      sessionId?: string;
      clientId?: string;
      workflowId?: string;
      text?: string;
    } = {}) => {
      const payload = {
        workflowId: options.workflowId ?? crypto.randomUUID(),
        sessionId: options.sessionId ?? 'session',
        clientId: options.clientId ?? 'client',
        text: options.text ?? 'Hello',
        mode,
        targets,
        roles: options.roles,
      };
      return command({ action: 'SEND_MESSAGE', payload }).then((result) => ({ ...result, ...payload }));
    },
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

test('Free sends only to ready-only targets and leaves other active providers unselected', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, true, { chatgpt: false, claude: null, gemini: false });
  t.after(app.close);
  await app.ready;
  const targets = readyActiveTargets(await app.command({ action: 'GET_CONNECTIONS' }), 'grok');
  assert.deepEqual(targets, ['meta']);
  await app.send('free', targets);
  assert.deepEqual(app.sent.map((message) => message.provider), ['meta']);
  assert.equal(app.broadcasts.some((message) => message.payload?.key === 'workflow.free.partial'), false);
  assert.equal(app.broadcasts.some((message) => message.provider === 'system'), false);
});

test('Free surfaces an undelivered Meta failure when another target still answers', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('free', ['chatgpt', 'meta']);
  await waitUntil(() => app.sent.length === 2, 'free fanout to ChatGPT and Meta');
  app.complete(app.sent.find((message) => message.provider === 'chatgpt'));
  const meta = app.sent.find((message) => message.provider === 'meta');
  app.removeTab(meta.tabId);
  await running;
  const metaError = app.broadcasts.find((message) => (
    message.action === 'RESPONSE_DONE' && message.provider === 'meta' && String(message.payload).includes('Error:')
  ));
  assert.equal(decodeError(String(metaError?.payload))?.key, 'error.tab_closed');
  assert.equal(app.broadcasts.some((message) => message.provider === 'system'), false);
  assert.ok(app.broadcasts.some((message) => message.payload?.done === true && message.payload?.cancelled !== true));
});

test('Free does not add a system error when every target already delivered [Error:]', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('free', ['chatgpt', 'meta']);
  await waitUntil(() => app.sent.length === 2, 'free fanout before delivered errors');
  for (const message of app.sent) app.fail(message, '[Error: quota]');
  await running;
  assert.equal(app.broadcasts.filter((message) => message.provider === 'system').length, 0);
  assert.ok(app.broadcasts.some((message) => message.payload?.done === true));
});

test('Debate with Meta as pro stays serial and does not open roundtable recovery', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => app.sent.length === 1, 'Meta debate opening turn');
  assert.equal(app.sent[0].provider, 'meta');
  app.fail(app.sent[0], '[Error: quota]');
  await running;
  assert.equal(app.sent.length, 1);
  assert.equal(app.broadcasts.some((message) => message.action === 'STEP_RECOVERY_REQUIRED'), false);
  assert.ok(app.broadcasts.some((message) => message.provider === 'system'));
});

test('Consult sends Meta and the other first seat in parallel before review', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('consult', undefined, { roles: META_CONSULT });
  await waitUntil(() => app.sent.length === 2, 'consult parallel first seats');
  assert.deepEqual(app.sent.map((message) => message.provider).sort(), ['chatgpt', 'meta']);
  assert.equal(app.sent.some((message) => message.provider === 'claude'), false);
  for (const message of [...app.sent]) app.complete(message);
  await waitUntil(() => app.sent.some((message) => message.provider === 'claude'), 'consult reviewer');
  await completeRemaining(app, running);
  assert.deepEqual([...app.sent.slice(0, 2).map((message) => message.provider)].sort(), ['chatgpt', 'meta']);
  assert.deepEqual(app.sent.slice(2).map((message) => message.provider), ['claude', 'gemini']);
});

test('Roundtable worker retries a failed Meta turn with a fresh request id', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('roundtable', undefined, { roles: META_ROUNDTABLE });
  await waitUntil(() => app.sent.length === 1, 'Meta roundtable first send');
  assert.equal(app.sent[0].provider, 'meta');
  app.fail(app.sent[0]);
  await waitUntil(() => app.broadcasts.some((message) => message.action === 'STEP_RECOVERY_REQUIRED'), 'Meta recovery prompt');
  const recovery = app.broadcasts.find((message) => message.action === 'STEP_RECOVERY_REQUIRED')!.payload;
  assert.equal(recovery.provider, 'meta');
  assert.equal((await app.command({ action: 'RESOLVE_STEP_RECOVERY', payload: { ...recovery, action: 'retry' } })).ok, true);
  await waitUntil(() => app.stops.some((message) => message.provider === 'meta' && message.requestId === app.sent[0].requestId), 'scoped Meta stop');
  await waitUntil(() => app.sent.length === 2, 'Meta retry send');
  assert.equal(app.sent[1].provider, 'meta');
  assert.notEqual(app.sent[1].requestId, app.sent[0].requestId);
  assert.equal(app.sent[1].payload.text, app.sent[0].payload.text);
  await completeRemaining(app, running);
  assert.equal(app.sent.length, 21);
  assert.equal(app.sent.filter((message) => message.provider === 'meta').length, 6);
});

test('Roundtable worker skip and cancel keep Meta errors out of later prompts', async (t) => {
  const skip = worker({ standbyProvider: 'grok' }, false);
  t.after(skip.close);
  await skip.ready;
  const skipping = skip.send('roundtable', undefined, { roles: META_ROUNDTABLE, text: 'Skip me' });
  await waitUntil(() => skip.sent.length === 1, 'Meta skip first send');
  skip.fail(skip.sent[0], '[Error: meta quota]');
  await waitUntil(() => skip.broadcasts.some((message) => message.action === 'STEP_RECOVERY_REQUIRED'), 'Meta skip recovery');
  const skipRecovery = skip.broadcasts.find((message) => message.action === 'STEP_RECOVERY_REQUIRED')!.payload;
  assert.equal((await skip.command({ action: 'RESOLVE_STEP_RECOVERY', payload: { ...skipRecovery, action: 'skip' } })).ok, true);
  await completeRemaining(skip, skipping);
  assert.equal(skip.sent.length, 20);
  assert.equal(skip.sent.filter((message) => message.provider === 'meta').length, 5);
  assert.equal(skip.sent.some((message) => String(message.payload?.text).includes('meta quota')), false);

  const cancel = worker({ standbyProvider: 'grok' }, false);
  t.after(cancel.close);
  await cancel.ready;
  const cancelling = cancel.send('roundtable', undefined, { roles: META_ROUNDTABLE });
  await waitUntil(() => cancel.sent.length === 1, 'Meta cancel first send');
  cancel.fail(cancel.sent[0]);
  await waitUntil(() => cancel.broadcasts.some((message) => message.action === 'STEP_RECOVERY_REQUIRED'), 'Meta cancel recovery');
  const cancelRecovery = cancel.broadcasts.find((message) => message.action === 'STEP_RECOVERY_REQUIRED')!.payload;
  assert.equal((await cancel.command({ action: 'RESOLVE_STEP_RECOVERY', payload: { ...cancelRecovery, action: 'cancel' } })).ok, true);
  await cancelling;
  assert.equal(cancel.sent.length, 1);
  assert.ok(cancel.stops.some((message) => message.provider === 'meta'));
  assert.ok(cancel.broadcasts.some((message) => message.payload?.done === true && message.payload?.cancelled === true));
});

test('CANCEL_WORKFLOW stops an in-flight Meta debate and ignores a late RESPONSE_DONE', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => app.sent.length === 1, 'Meta debate send before cancel');
  const workflowId = app.sent[0].workflowId;
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId, sessionId: 'session', clientId: 'client' },
  })).ok, true);
  await running;
  assert.equal(app.sent.length, 1);
  assert.ok(app.stops.some((message) => message.provider === 'meta' && message.workflowId === workflowId));
  const doneCount = app.broadcasts.filter((message) => message.payload?.done === true).length;
  app.complete(app.sent[0]);
  assert.equal(app.sent.length, 1);
  assert.equal(app.broadcasts.filter((message) => message.payload?.done === true).length, doneCount);
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId, sessionId: 'session', clientId: 'client' },
  }, { tab: { id: 5 } })).ok, false);
});

test('panel reconnect rebinds a live Meta debate so the new client can cancel', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => app.sent.length === 1 && app.sent[0].provider === 'meta', 'Meta debate before reconnect');
  const workflowId = app.sent[0].workflowId;
  await app.command({ action: 'GET_CONNECTIONS', payload: { clientId: 'panel-2', sessionId: 'session' } });
  await waitUntil(() => app.broadcasts.some((message) => (
    message.action === 'WORKFLOW_STATUS' && message.payload?.clientId === 'panel-2' && !message.payload?.done
  )), 'replayed status for the new panel');
  assert.ok(app.broadcasts.some((message) => (
    message.action === 'ROLE_ASSIGNMENT' && message.provider === 'meta' && message.payload?.clientId === 'panel-2'
  )));
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId, sessionId: 'session', clientId: 'client' },
  })).ok, false);
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId, sessionId: 'session', clientId: 'panel-2' },
  })).ok, true);
  await running;
  assert.equal(app.sent.length, 1);
  assert.ok(app.stops.some((message) => message.provider === 'meta'));
});

test('panel reconnect during Meta recovery rotates the decision identity', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('roundtable', undefined, { roles: META_ROUNDTABLE });
  await waitUntil(() => app.sent.length === 1, 'Meta recovery before reconnect');
  app.fail(app.sent[0]);
  await waitUntil(() => app.broadcasts.some((message) => message.action === 'STEP_RECOVERY_REQUIRED'), 'original Meta recovery');
  const original = app.broadcasts.find((message) => message.action === 'STEP_RECOVERY_REQUIRED')!.payload;
  await app.command({ action: 'GET_CONNECTIONS', payload: { clientId: 'panel-2', sessionId: 'session' } });
  await waitUntil(() => app.broadcasts.some((message) => (
    message.action === 'STEP_RECOVERY_REQUIRED' && message.payload?.clientId === 'panel-2'
  )), 'rebound Meta recovery');
  const rebound = [...app.broadcasts].reverse().find((message) => (
    message.action === 'STEP_RECOVERY_REQUIRED' && message.payload?.clientId === 'panel-2'
  ))!.payload;
  assert.notEqual(rebound.recoveryId, original.recoveryId);
  assert.equal((await app.command({ action: 'RESOLVE_STEP_RECOVERY', payload: { ...original, action: 'retry' } })).ok, false);
  assert.equal((await app.command({ action: 'RESOLVE_STEP_RECOVERY', payload: { ...rebound, action: 'skip' } })).ok, true);
  await completeRemaining(app, running);
  assert.equal(app.sent.length, 20);
});

test('a replacement worker tells the reopened panel that a Meta workflow was interrupted', async (t) => {
  const first = worker({ standbyProvider: 'grok' }, false);
  t.after(first.close);
  await first.ready;
  const running = first.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => first.sent.length === 1, 'Meta debate before worker replacement');
  const snapshot = { ...first.session };
  assert.ok(snapshot.multiAiActiveWorkflow);
  assert.equal((await first.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId: first.sent[0].workflowId, sessionId: 'session', clientId: 'client' },
  })).ok, true);
  await running;
  const second = worker({ standbyProvider: 'grok' }, true, {}, [], { session: snapshot });
  t.after(second.close);
  await second.ready;
  await second.command({ action: 'GET_CONNECTIONS', payload: { clientId: 'panel-2', sessionId: 'session' } });
  await waitUntil(() => second.broadcasts.some((message) => message.payload?.key === 'workflow.interrupted'), 'interrupted status');
  assert.equal(decodeError(second.broadcasts.find((message) => message.provider === 'system')?.payload)?.key, 'error.worker_stopped');
  assert.ok(second.broadcasts.some((message) => (
    message.payload?.done === true && message.payload?.cancelled === false && message.payload?.clientId === 'panel-2'
  )));
});

test('default standby still repairs Meta out of Debate roles and leaves its tab untouched', async (t) => {
  const app = worker();
  t.after(app.close);
  await app.ready;
  await app.send('debate', undefined, { roles: META_DEBATE });
  assert.equal(app.sent.some((message) => message.provider === 'meta'), false);
  assert.deepEqual(app.sent.map((message) => message.provider), ['grok', 'chatgpt', 'claude', 'gemini']);
  await app.command({ action: 'RESET_PROVIDER_SESSIONS' });
  assert.equal(app.navigated.includes(5), false);
});

test('late Meta RESPONSE_DONE after Free completion does not restart the worker', async (t) => {
  const app = worker({ standbyProvider: 'grok' });
  t.after(app.close);
  await app.ready;
  await app.send('free', ['meta']);
  const doneCount = app.broadcasts.filter((message) => message.payload?.done === true).length;
  app.complete(app.sent[0]);
  assert.equal(app.sent.length, 1);
  assert.equal(app.broadcasts.filter((message) => message.payload?.done === true).length, doneCount);
});

test('GET_CONNECTIONS after a finished Meta debate does not replay status or roles', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => app.sent.length === 1, 'Meta debate before finish');
  await completeRemaining(app, running);
  const before = app.broadcasts.length;
  await app.command({ action: 'GET_CONNECTIONS', payload: { clientId: 'panel-2', sessionId: 'session' } });
  const extra = app.broadcasts.slice(before);
  assert.equal(extra.some((message) => message.action === 'ROLE_ASSIGNMENT' && message.payload?.clientId === 'panel-2'), false);
  assert.equal(extra.some((message) => (
    message.action === 'WORKFLOW_STATUS' && message.payload?.clientId === 'panel-2' && !message.payload?.done
  )), false);
});

test('GET_CONNECTIONS for a different session does not rebind a live Meta debate', async (t) => {
  const app = worker({ standbyProvider: 'grok' }, false);
  t.after(app.close);
  await app.ready;
  const running = app.send('debate', undefined, { roles: META_DEBATE });
  await waitUntil(() => app.sent.length === 1, 'Meta debate before other session');
  await app.command({ action: 'GET_CONNECTIONS', payload: { clientId: 'other-panel', sessionId: 'other-session' } });
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId: app.sent[0].workflowId, sessionId: 'session', clientId: 'other-panel' },
  })).ok, false);
  assert.equal((await app.command({
    action: 'CANCEL_WORKFLOW',
    payload: { workflowId: app.sent[0].workflowId, sessionId: 'session', clientId: 'client' },
  })).ok, true);
  await running;
});

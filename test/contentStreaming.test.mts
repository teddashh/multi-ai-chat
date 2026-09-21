import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test, { type TestContext } from 'node:test';
import ts from 'typescript';

// Run the actual content engine with a controllable clock and provider DOM.
// The busy signal remains true while answer text arrives, just like Meta's Stop.
function content(t: TestContext, streamWhileThinking?: boolean) {
  // Keep browser timer ordering independent of Node's experimental MockTimers,
  // whose scheduling behavior differs between the CI and local runtimes.
  let now = 10000;
  let timerId = 0;
  const pending = new Map<number, { callback: () => void; at: number; interval?: number }>();
  function schedule(callback: () => void, delay: number, repeat = false) {
    const id = ++timerId;
    pending.set(id, { callback, at: now + delay, interval: repeat ? delay : undefined });
    return id;
  }
  const timers = {
    setTimeout: (callback: () => void, delay: number) => schedule(callback, delay),
    setInterval: (callback: () => void, delay: number) => schedule(callback, delay, true),
    clearTimeout: (id: number) => { pending.delete(id); },
    clearInterval: (id: number) => { pending.delete(id); },
  };
  function tick(ms: number) {
    const until = now + ms;
    while (true) {
      const next = [...pending].filter(([, timer]) => timer.at <= until)
        .sort(([idA, a], [idB, b]) => a.at - b.at || idA - idB)[0];
      if (!next) break;
      const [id, timer] = next;
      now = timer.at;
      if (timer.interval !== undefined) timer.at += timer.interval;
      else pending.delete(id);
      timer.callback();
    }
    now = until;
  }
  const messages: any[] = [];
  let listener: Function;
  let mutation: Function;
  let busy = false;
  let stopClicks = 0;
  class Element {
    tagName = 'DIV';
    textContent = '';
    nodeType = 1;
    disabled = false;
    focus() {}
    closest() { return null; }
    getAttribute() { return null; }
    hasAttribute() { return false; }
    getClientRects() { return [{}]; }
  }
  class Textarea extends Element { value = ''; }
  const input = new Textarea();
  const send = Object.assign(new Element(), { click() { input.value = ''; busy = true; } });
  const stop = Object.assign(new Element(), { click() { stopClicks++; busy = false; } });
  const previous = Object.assign(new Element(), { textContent: 'historical answer' });
  const responses = [previous];
  const window = { ...timers, getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) } as any;
  const context = vm.createContext({
    window, ...timers, Date: class extends Date { static now() { return now; } },
    HTMLElement: Element, HTMLTextAreaElement: Textarea, HTMLInputElement: class extends Element {},
    document: {
      body: {},
      querySelectorAll(selector: string) {
        if (selector === '#input') return [input];
        if (selector === '#send') return [send];
        if (selector === '#stop') return busy ? [stop] : [];
        if (selector === '#answer') return responses;
        return [];
      },
    },
    MutationObserver: class {
      constructor(callback: Function) { mutation = callback; }
      observe() {}
      disconnect() {}
    },
    chrome: { runtime: {
      id: 'test',
      sendMessage: async (message: any) => { messages.push(message); },
      onMessage: { addListener(callback: Function) { listener = callback; }, removeListener() {} },
    } },
  });
  const cache = new Map<string, any>();
  function load(file: string): any {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInContext(`(function(require, module, exports) {${code}\n})`, context)(
      (relative: string) => load(path.resolve(path.dirname(file), `${relative}.ts`)), module, module.exports,
    );
    return module.exports;
  }
  load(fileURLToPath(new URL('../src/content/base.ts', import.meta.url))).createContentScript({
    provider: 'meta', inputSelectors: ['#input'], sendButtonSelectors: ['#send'],
    responseSelectors: ['#answer'], stopButtonSelectors: ['#stop'],
    loginDetector: () => true, isThinking: () => busy, streamWhileThinking,
    injectInput: (_input: unknown, text: string) => { input.value = text; },
    doneDelay: 1000, chunkDebounce: 0,
  });
  t.after(() => window.__multiAiChat_meta.dispose());
  const command = (message: any): Promise<any> => new Promise(resolve => listener(message, {}, resolve));
  return {
    async start() {
      assert.equal((await command({ action: 'SEND_MESSAGE', provider: 'meta', requestId: 'request', workflowId: 'workflow', payload: { text: 'prompt' } })).ok, true);
      tick(800);
      // The send-button lookup is asynchronous even when the first lookup succeeds.
      for (let i = 0; i < 8; i++) await Promise.resolve();
      assert.equal(busy, true);
    },
    answer(text: string, notify = true) {
      if (responses.length === 1) responses.push(new Element());
      responses[1].textContent = text;
      if (notify) mutation();
    },
    end() { busy = false; },
    tick,
    chunks: () => messages.filter(message => message.action === 'RESPONSE_CHUNK'),
    done: () => messages.filter(message => message.action === 'RESPONSE_DONE'),
    stop: () => command({ action: 'STOP_GENERATION', provider: 'meta', requestId: 'request', workflowId: 'workflow' }),
    stopClicks: () => stopClicks,
  };
}

test('Meta can stream answer mutations while Stop remains visible without finishing early', async (t) => {
  const app = content(t, true);
  await app.start();
  app.answer('first chunk');
  assert.equal(app.chunks().at(-1)?.payload, 'first chunk');
  assert.equal(app.chunks().at(-1)?.requestId, 'request');
  app.tick(4000);
  assert.equal(app.done().length, 0);
  app.answer('first chunk and final text');
  assert.equal(app.chunks().at(-1)?.payload, 'first chunk and final text');
  app.end();
  app.tick(1000); // Observe the cleared busy signal, then wait the final quiet period.
  app.tick(1000);
  assert.equal(app.done().length, 1);
  assert.equal(app.done()[0].payload, 'first chunk and final text');
});

test('Meta polling also captures a streaming answer when no mutation notification arrives', async (t) => {
  const app = content(t, true);
  await app.start();
  app.answer('polled chunk', false);
  app.tick(3000);
  assert.equal(app.chunks().at(-1)?.payload, 'polled chunk');
  assert.equal(app.done().length, 0);
});

test('Meta still waits for a busy provider that has not produced answer text after two minutes', async (t) => {
  const app = content(t, true);
  await app.start();
  app.tick(120000);
  app.tick(6000);
  assert.equal(app.chunks().length, 0);
  assert.equal(app.done().length, 0);
});

test('providers without the opt-in still withhold thinking text until their busy signal ends', async (t) => {
  const app = content(t);
  await app.start();
  app.answer('thinking text');
  app.tick(3000);
  assert.equal(app.chunks().length, 0);
  assert.equal(app.done().length, 0);
  app.end();
  app.answer('final answer');
  app.tick(1000);
  assert.equal(app.done()[0]?.payload, 'final answer');
});

test('scoped Stop during a streamed answer suppresses subsequent chunks and completion', async (t) => {
  const app = content(t, true);
  await app.start();
  app.answer('partial answer');
  assert.equal(app.chunks().length, 1);
  assert.equal((await app.stop()).ok, true);
  assert.equal(app.stopClicks(), 1);
  app.answer('late text after Stop');
  app.tick(6000);
  assert.equal(app.chunks().length, 1);
  assert.equal(app.done().length, 0);
});

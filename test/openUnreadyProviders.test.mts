import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import type { AIProvider } from '../src/shared/types.ts';
import { openUnreadyProviders } from '../src/sidepanel/openUnreadyProviders.ts';
import { SUPPORTED_LOCALES, setLocale, t } from '../src/shared/i18n.ts';

test('shortcut opens only selected, unready, active providers once', async () => {
  const opened: AIProvider[] = [];
  const failed = await openUnreadyProviders(['chatgpt', 'claude', 'claude', 'grok', 'meta'], 'grok', {
    meta: { status: 'connected' }, chatgpt: { status: 'login-required' }, claude: { status: 'checking' },
    gemini: { status: 'disconnected' },
  }, async (provider) => { opened.push(provider); });
  assert.deepEqual(opened, ['chatgpt', 'claude']);
  assert.deepEqual(failed, []);
});

test('shortcut finishes all opens and names only failures for retry', async () => {
  const opened: AIProvider[] = [];
  let finishGemini!: () => void;
  const gemini = new Promise<void>((resolve) => { finishGemini = resolve; });
  let complete = false;
  const opening = openUnreadyProviders(['chatgpt', 'claude', 'gemini'], 'meta', {}, (provider) => {
    opened.push(provider);
    if (provider === 'claude') throw new Error('tab open failed');
    return provider === 'gemini' ? gemini : Promise.resolve();
  }).then((failures) => { complete = true; return failures; });
  await Promise.resolve();
  assert.deepEqual(opened, ['chatgpt', 'claude', 'gemini']);
  assert.equal(complete, false);
  finishGemini();
  assert.deepEqual(await opening, ['claude']);
  assert.deepEqual(await openUnreadyProviders(['claude'], 'meta', {}, async () => {}), []);
});

test('empty, ready-only and standby-only selections do not open tabs', async () => {
  for (const selected of [[], ['meta'], ['chatgpt']] as AIProvider[][]) {
    assert.deepEqual(await openUnreadyProviders(selected, 'meta', { chatgpt: { status: 'connected' } }, async () => {
      assert.fail('no tab should open');
    }), []);
  }
});

// Render the real InputBar with React, without requiring a browser or a new dependency.
const module = { exports: {} as { default: React.ComponentType<any> } };
const code = ts.transpileModule(readFileSync(new URL('../src/sidepanel/components/InputBar.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(`(function(require, module, exports) {${code}\n})`)(
  (id: string) => {
    if (id === 'react') return React;
    if (id === '../../shared/i18n') return { t };
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports,
);
const InputBar = module.exports.default;
function render(overrides: Record<string, unknown> = {}) {
  setLocale('en');
  return renderToStaticMarkup(React.createElement(InputBar, {
    onSend: () => {}, onCancel: () => {}, disabled: true, isProcessing: false,
    readinessNotice: 'Not ready: ChatGPT · Claude.', onOpenUnready: () => {}, ...overrides,
  }));
}
function openButton(markup: string) {
  return markup.match(/<button\b[^>]*>(?:Open unready AIs|Opening…)<\/button>/)?.[0];
}

test('blocked prompt keeps the open shortcut enabled and associated with the named hint', () => {
  const markup = render();
  assert.match(markup, /<textarea\b[^>]*disabled=""/);
  assert.ok(openButton(markup));
  assert.doesNotMatch(openButton(markup)!, / disabled=""/);
  assert.match(openButton(markup)!, /aria-describedby="input-readiness"/);
  assert.match(markup, /id="input-readiness" role="status"[^>]*>Not ready: ChatGPT · Claude\./);
});

test('shortcut is disabled while opening, hides without a hint, and shows named open errors', () => {
  assert.match(openButton(render({ isOpeningUnready: true }))!, /disabled=""/);
  assert.match(openButton(render({ isProcessing: true }))!, /disabled=""/);
  assert.equal(openButton(render({ readinessNotice: undefined })), undefined);
  assert.equal(openButton(render({ onOpenUnready: undefined })), undefined);
  const partial = render({ disabled: false, readinessOpenError: 'Could not open: Claude. Try again.' });
  assert.doesNotMatch(partial.match(/<textarea\b[^>]*>/)![0], / disabled=""/);
  assert.doesNotMatch(openButton(partial)!, / disabled=""/);
  assert.match(partial, /role="alert"[^>]*>Could not open: Claude\. Try again\./);
});

test('shortcut labels and failures are explicitly translated in all five locales', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of ['connection.open_unready', 'connection.opening', 'error.open_unready_failed']) {
      const text = t(key, { providers: 'ChatGPT · Meta AI' }, locale);
      assert.notEqual(text, key);
      assert.doesNotMatch(text, /\{\w+\}/);
      if (locale !== 'en') assert.notEqual(text, t(key, { providers: 'ChatGPT · Meta AI' }, 'en'));
      if (key === 'error.open_unready_failed') assert.ok(text.includes('ChatGPT · Meta AI'));
    }
  }
});

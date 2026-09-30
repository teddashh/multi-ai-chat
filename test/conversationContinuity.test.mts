import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { ERROR_MARKER } from '../src/shared/errors.ts';
import type { ChatMessage } from '../src/shared/types.ts';

// Production modules import extensionless paths for webpack. Load this one the
// same way the service-worker harness does, so the test runs the real guard.
function loadContinuity(): {
  buildConversationReplayContext: (messages: readonly ChatMessage[]) => string | undefined;
} {
  const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const context = vm.createContext({ console });
  function load(file: string): Record<string, unknown> {
    const cached = cache.get(file);
    if (cached) return cached.exports;
    const module = { exports: {} as Record<string, unknown> };
    cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const run = vm.runInContext(
      `(function(require, module, exports) {${code}\n})`,
      context,
      { filename: file },
    );
    run((relative: string) => load(path.resolve(path.dirname(file), `${relative}.ts`)), module, module.exports);
    return module.exports;
  }
  return load(path.join(root, 'src/shared/conversationContinuity.ts')) as {
    buildConversationReplayContext: (messages: readonly ChatMessage[]) => string | undefined;
  };
}

const { buildConversationReplayContext } = loadContinuity();

function msg(id: string, role: ChatMessage['role'], content: string, rest: Partial<ChatMessage> = {}): ChatMessage {
  return { id, role, content, timestamp: 1, ...rest };
}

test('replay drops malformed rows, streaming placeholders, and error envelopes without throwing', () => {
  const context = buildConversationReplayContext([
    null as never,
    { id: 4, role: 'user', content: 'numeric id' } as never,
    { id: 'missing-content', role: 'user' } as never,
    { id: 'bad-content', role: 'ai', content: 5, timestamp: 1 } as never,
    msg('partial-streaming', 'ai', 'still arriving', { provider: 'claude' }),
    msg('marked', 'ai', `${ERROR_MARKER} translated failure`, { provider: 'meta' }),
    msg('bracketed', 'ai', '[Error: quota]', { provider: 'chatgpt' }),
    msg('bare', 'ai', 'Error: native exception'),
    msg('lower', 'ai', 'error: also dropped', { provider: 'gemini' }),
    msg('blank', 'user', '   '),
    msg('u1', 'user', 'keep me'),
    msg('mid', 'ai', 'The notes mention Error: only in the middle', { provider: 'claude' }),
    msg('a1', 'ai', 'answer', { provider: 'meta' }),
  ]);
  assert.equal(context, [
    'User:',
    'keep me',
    '',
    'Claude:',
    'The notes mention Error: only in the middle',
    '',
    'Meta AI:',
    'answer',
  ].join('\n'));
});

test('replay is empty when every row is dropped by the guard', () => {
  assert.equal(buildConversationReplayContext([]), undefined);
  assert.equal(buildConversationReplayContext([
    null as never,
    msg('only-streaming', 'ai', 'partial', { provider: 'grok' }),
    msg('only-error', 'ai', '[Error: closed]'),
  ]), undefined);
});

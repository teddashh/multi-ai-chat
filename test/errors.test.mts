// 用 Node 內建的 node:test，沒有測試框架依賴。直接跑 TypeScript 原始碼，
// 需要 Node 22.6+ 的原生型別剝離（本機為 v26）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeError, decodeError, ERROR_MARKER } from '../src/shared/errors.ts';

// 錯誤訊息必須活著穿過三層：content script 的 [Error: …] 信封、
// 背景 sendSystemError 的 Error: … 信封，中途還被包成 Error 物件再丟出。
// 任何一層弄壞編碼，使用者看到的就是一串 JSON 而不是翻譯後的訊息。

test('content script 的 [Error: …] 信封可以還原鍵值與參數', () => {
  const wire = `[Error: ${encodeError('error.no_response_text', { provider: 'claude' })}]`;
  assert.deepEqual(decodeError(wire), {
    key: 'error.no_response_text',
    params: { provider: 'claude' },
  });
});

test('背景 Error: … 信封可以還原數值參數', () => {
  const wire = `Error: ${encodeError('error.timeout', { provider: 'grok', seconds: 600 })}`;
  assert.deepEqual(decodeError(wire)?.params, { provider: 'grok', seconds: 600 });
});

test('detail 內含 } 或 ] 時不會提早切斷 JSON', () => {
  const detail = 'closed } and ] inside';
  const wire = `[Error: ${encodeError('error.send_failed', { provider: 'gemini', detail })}]`;
  assert.equal(decodeError(wire)?.params?.detail, detail);
});

test('未編碼的原生例外必須原樣放過，不能被吃掉', () => {
  assert.equal(decodeError('Error: TypeError: x is not a function'), null);
  assert.equal(decodeError('HackMD 401: Unauthorized'), null);
});

test('壞掉的 payload 回 null，讓呼叫端顯示原文而不是爆掉', () => {
  assert.equal(decodeError('i18n:{not json}'), null);
  assert.equal(decodeError('i18n:no-braces-at-all'), null);
});

test('沒有參數的鍵也要能還原', () => {
  assert.equal(decodeError(`Error: ${encodeError('error.no_target')}`)?.key, 'error.no_target');
});

test('ERROR_MARKER 與對話回放的過濾條件是同一個字元', () => {
  assert.equal(ERROR_MARKER, '⚠️');
});

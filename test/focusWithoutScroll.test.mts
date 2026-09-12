import assert from 'node:assert/strict';
import test from 'node:test';

import { focusWithoutScroll } from '../src/content/focusWithoutScroll.ts';

test('provider controls are focused without moving the page', () => {
  const calls: Array<FocusOptions | undefined> = [];
  focusWithoutScroll({ focus: (options?: FocusOptions) => calls.push(options) });
  assert.deepEqual(calls, [{ preventScroll: true }]);
});

test('focus falls back for an element wrapper that rejects FocusOptions', () => {
  const calls: Array<FocusOptions | undefined> = [];
  focusWithoutScroll({
    focus: (options?: FocusOptions) => {
      calls.push(options);
      if (options) throw new TypeError('FocusOptions unsupported');
    },
  });
  assert.deepEqual(calls, [{ preventScroll: true }, undefined]);
});

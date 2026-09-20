import assert from 'node:assert/strict';
import test from 'node:test';
import { isUsableMetaControl, metaSessionReady } from '../src/content/metaDom.ts';

function control(options: { disabled?: boolean; readOnly?: boolean; ancestor?: string; visible?: boolean } = {}) {
  return {
    ...options,
    closest: (selectors: string) => options.ancestor && selectors.includes(options.ancestor) ? {} : null,
  };
}

test('Meta accepts an enabled guest composer without requiring an account marker', () => {
  assert.equal(metaSessionReady([control()], () => true), true);
});

test('Meta never reports an inert, disabled, readonly or hidden composer as ready', () => {
  const blocked = [
    control({ disabled: true }),
    control({ readOnly: true }),
    ...['[inert]', '[disabled]', '[readonly]', '[aria-disabled="true"]', '[aria-hidden="true"]']
      .map((ancestor) => control({ ancestor })),
  ];
  for (const input of blocked) {
    assert.equal(isUsableMetaControl(input), false);
    assert.equal(metaSessionReady([input], () => true), false);
  }
  assert.equal(metaSessionReady([control()], () => false), false);
  assert.equal(metaSessionReady([], () => true), false);
});

test('Meta can select the live composer after an inert prehydration placeholder', () => {
  assert.equal(metaSessionReady([control({ ancestor: '[inert]' }), control()], () => true), true);
});

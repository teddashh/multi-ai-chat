import assert from 'node:assert/strict';
import test from 'node:test';
import { META_INPUT_SELECTORS, isMetaLoginLabel, isUsableMetaControl, metaLoginStatus, metaSessionReady } from '../src/content/metaDom.ts';
import { firstAcceptedCandidate } from '../src/content/elementSelection.ts';

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
    ...['[inert]', '[disabled]', '[readonly]', '[aria-readonly="true"]', '[aria-disabled="true"]', '[aria-hidden="true"]']
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

for (const selector of [
  'textarea[data-testid="composer-input"]',
  '[data-testid="composer-input"][contenteditable="true"]',
]) {
  test(`Meta finds hydrated ${selector} without the legacy aria label or prehydration attribute`, () => {
    const placeholder = control({ ancestor: '[inert]', visible: true });
    const hidden = control({ visible: false });
    const editor = control({ visible: true });
    const candidates = new Map([
      ['input[aria-label="Ask Meta AI"]', [placeholder]],
      [selector, [hidden, editor]],
    ]);
    assert.strictEqual(firstAcceptedCandidate(
      META_INPUT_SELECTORS,
      (query) => candidates.get(query) ?? [],
      (candidate) => Boolean(candidate.visible) && isUsableMetaControl(candidate),
    ), editor);
  });
}

test('an enabled authenticated or guest composer wins over an optional header login button', () => {
  for (const hasLoginButton of [false, true]) {
    assert.equal(metaLoginStatus([control()], () => true, hasLoginButton), true);
  }
});

test('a visible login modal blocks a composer even when the page forgot to mark it inert', () => {
  assert.equal(metaLoginStatus([control()], () => true, true, true), false);
});

test('an inert composer or visible login button establishes a real login requirement', () => {
  assert.equal(metaLoginStatus([control({ ancestor: '[inert]' })], () => true, false), false);
  assert.equal(metaLoginStatus([], () => true, true), false);
});

test('missing, hidden or temporarily disabled inputs without login evidence stay unknown', () => {
  assert.equal(metaLoginStatus([], () => true, false), null);
  assert.equal(metaLoginStatus([control({ ancestor: '[inert]' })], () => false, false), null);
  assert.equal(metaLoginStatus([control({ disabled: true })], () => true, false), null);
});

test('login modal controls can be recognized without a test id', () => {
  for (const label of ['Log in', ' Sign in ', '登入', '登录', 'ログイン', 'Anmelden', '로그인']) {
    assert.equal(isMetaLoginLabel(label), true);
  }
  for (const label of ['Close', 'Send', 'Login history', 'Log in later']) {
    assert.equal(isMetaLoginLabel(label), false);
  }
});

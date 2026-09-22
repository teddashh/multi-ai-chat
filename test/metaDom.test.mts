import assert from 'node:assert/strict';
import test from 'node:test';
import {
  META_INPUT_SELECTORS,
  isMetaGenerationActive,
  isMetaLoginLabel,
  isMetaSendControl,
  isMetaStopControl,
  isUsableMetaControl,
  isVisibleMetaElement,
  metaLoginStatus,
  metaSessionReady,
} from '../src/content/metaDom.ts';
import { firstAcceptedCandidate } from '../src/content/elementSelection.ts';
import { control } from './metaControls.mts';

test('Meta accepts an enabled guest composer without requiring an account marker', () => {
  assert.equal(metaSessionReady([control()], () => true), true);
});

test('Meta never reports an inert, disabled, readonly or hidden composer as ready', () => {
  const blocked = [
    control({ disabled: true }),
    control({ readOnly: true }),
    ...['[inert]', '[disabled]', '[data-disabled="true"]', '[readonly]', '[aria-readonly="true"]', '[aria-disabled="true"]', '[aria-hidden="true"]']
      .map((ancestor) => control({ ancestor })),
  ];
  for (const input of blocked) {
    const label = input.ancestor ?? (input.disabled ? 'disabled' : 'readOnly');
    assert.equal(isUsableMetaControl(input), false, label);
    assert.equal(metaSessionReady([input], () => true), false, label);
  }
  assert.equal(metaSessionReady([control()], () => false), false);
  assert.equal(metaSessionReady([], () => true), false);
});

test('a laid-out Meta element with computed opacity 0 is not visible', (t) => {
  const element = Object.assign(control(), { getClientRects: () => [{}] });
  let opacity = '0';
  const previousWindow = globalThis.window;
  globalThis.window = {
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity }),
  } as unknown as Window & typeof globalThis;
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });

  assert.equal(isVisibleMetaElement(element as unknown as Element), false, 'opacity 0');
  for (const value of ['', '1', '0.01']) {
    opacity = value;
    assert.equal(isVisibleMetaElement(element as unknown as Element), true, `opacity ${JSON.stringify(value)}`);
  }
});

test('Meta can select the live composer after an inert prehydration placeholder', () => {
  assert.equal(metaSessionReady([control({ ancestor: '[inert]' }), control()], () => true), true);
});

for (const selector of [
  'textarea[data-testid="composer-input"]',
  '[data-testid="composer-input"][contenteditable="true"]',
  'textarea[aria-label="Ask Meta AI"]',
  '[contenteditable="true"][role="textbox"]',
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

test('an enabled authenticated or guest composer wins over a login control and an inert placeholder', () => {
  const usable = control();
  const inert = control({ ancestor: '[inert]' });
  for (const hasLoginButton of [false, true]) {
    for (const hasLoginWall of [false, true]) {
      assert.equal(metaLoginStatus([inert, usable], () => true, hasLoginButton, hasLoginWall), true);
    }
  }
});

test('a visible login modal requires sign-in only when no usable composer remains', () => {
  assert.equal(metaLoginStatus([control({ ancestor: '[inert]' })], () => true, true, true), false);
  assert.equal(metaLoginStatus([], () => true, false, true), false);
});

test('an inert composer or visible login button establishes a real login requirement', () => {
  assert.equal(metaLoginStatus([control({ ancestor: '[inert]' })], () => true, false), false);
  assert.equal(metaLoginStatus([], () => true, true), false);
});

test('missing, hidden or temporarily disabled inputs without login evidence stay unknown', () => {
  assert.equal(metaLoginStatus([], () => true, false), null);
  assert.equal(metaLoginStatus([control({ ancestor: '[inert]' })], () => false, false), null);
  assert.equal(metaLoginStatus([control({ disabled: true })], () => true, false), null);
  assert.equal(metaLoginStatus([control({ readOnly: true })], () => true, false), null);
  assert.equal(metaLoginStatus([control({ ancestor: '[aria-disabled="true"]' })], () => true, false), null);
  assert.equal(metaLoginStatus([control({ ancestor: '[aria-readonly="true"]' })], () => true, false), null);
  assert.equal(metaLoginStatus([control({ ancestor: '[data-disabled="true"]' })], () => true, false), null);
});

test('login modal controls can be recognized without a test id', () => {
  for (const label of ['Log in', ' Sign in ', '登入', '登录', 'ログイン', 'Anmelden', '로그인']) {
    assert.equal(isMetaLoginLabel(label), true);
  }
  for (const label of ['Close', 'Send', 'Login history', 'Log in later']) {
    assert.equal(isMetaLoginLabel(label), false);
  }
});

test('generic Stop and Send controls require a usable composer, not leftover markup', () => {
  assert.equal(isMetaStopControl(control()), false);
  assert.equal(isMetaSendControl(control()), false);
  assert.equal(isMetaStopControl(control({ container: 'inert' })), false);
  assert.equal(isMetaSendControl(control({ container: 'inert' })), false);
  assert.equal(isMetaStopControl(control({ testId: 'composer-stop-button' })), true);
  assert.equal(isMetaSendControl(control({ testId: 'composer-send-button' })), true);
  assert.equal(isMetaStopControl(control({ container: 'usable' })), true);
  assert.equal(isMetaSendControl(control({ container: 'usable' })), true);
  assert.equal(isMetaStopControl(control({ container: 'mixed' })), true);
  assert.equal(isMetaStopControl(control({ testId: 'composer-stop-button', disabled: true })), false);
  assert.equal(isMetaStopControl(control({ testId: 'composer-stop-button', ancestor: '[inert]' })), false);
});

test('a visible stray Stop does not keep Meta generation active', () => {
  const stray = control({ visible: true });
  const hiddenComposerStop = control({ testId: 'composer-stop-button', visible: false });
  const liveComposerStop = control({ testId: 'composer-stop-button', visible: true });
  const visible = (element: { visible?: boolean }) => element.visible !== false;

  assert.equal(isMetaGenerationActive([stray], visible), false);
  assert.equal(isMetaGenerationActive([stray, hiddenComposerStop], visible), false);
  assert.equal(isMetaGenerationActive([control({ container: 'inert', visible: true })], visible), false);
  assert.equal(isMetaGenerationActive([stray, liveComposerStop], visible), true);
});

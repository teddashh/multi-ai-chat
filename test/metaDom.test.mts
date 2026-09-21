import assert from 'node:assert/strict';
import test from 'node:test';
import {
  META_INPUT_SELECTORS,
  isMetaGenerationActive,
  isMetaLoginLabel,
  isMetaSendControl,
  isMetaStopControl,
  isUsableMetaControl,
  metaLoginStatus,
  metaSessionReady,
} from '../src/content/metaDom.ts';
import { firstAcceptedCandidate } from '../src/content/elementSelection.ts';

function usableInput() {
  return { closest: () => null };
}

function inertInput() {
  return { closest: (selectors: string) => selectors.includes('[inert]') ? {} : null };
}

function composerContainer(kind: 'usable' | 'inert' | 'mixed') {
  const usable = usableInput();
  const inert = inertInput();
  const inputs = kind === 'usable' ? [usable] : kind === 'inert' ? [inert] : [inert, usable];
  return {
    querySelector: () => inputs[0],
    querySelectorAll: () => inputs,
  };
}

function control(options: {
  disabled?: boolean;
  readOnly?: boolean;
  ancestor?: string;
  visible?: boolean;
  testId?: string | null;
  container?: 'usable' | 'inert' | 'mixed';
} = {}) {
  return {
    ...options,
    getAttribute: (name: string) => name === 'data-testid' ? (options.testId ?? null) : null,
    closest: (selectors: string) => {
      if (options.ancestor && selectors.includes(options.ancestor)) return {};
      if (options.container && selectors.includes('[data-testid*="composer"]')) {
        return composerContainer(options.container);
      }
      return null;
    },
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

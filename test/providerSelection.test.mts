import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_PROVIDERS,
  activeProviders,
  normalizeStandbyProvider,
  readyActiveTargets,
  repairRoles,
  selectedActiveTargets,
  swapFreeTargets,
} from '../src/shared/providerSelection.ts';
import {
  DEFAULT_DEBATE_ROLES,
  DEFAULT_CONSULT_ROLES,
  DEFAULT_CODING_ROLES,
  DEFAULT_ROUNDTABLE_ROLES,
} from '../src/shared/constants.ts';
import type { AIConnection, AIProvider } from '../src/shared/types.ts';
import { SUPPORTED_LOCALES, t } from '../src/shared/i18n.ts';

const defaults = [DEFAULT_DEBATE_ROLES, DEFAULT_CONSULT_ROLES, DEFAULT_CODING_ROLES, DEFAULT_ROUNDTABLE_ROLES];

test('existing installations retain the original four providers with Meta on standby', () => {
  for (const stored of [undefined, null, '', 'unknown', '__proto__']) {
    assert.equal(normalizeStandbyProvider(stored), 'meta');
    assert.deepEqual(activeProviders(normalizeStandbyProvider(stored)), ['chatgpt', 'claude', 'gemini', 'grok']);
  }
});

test('every standby swap preserves four seats, valid roles and selected free targets', () => {
  for (const from of ALL_PROVIDERS) {
    const before = activeProviders(from);
    for (const to of ALL_PROVIDERS) {
      const after = activeProviders(to);
      assert.equal(after.length, 4);
      assert.equal(after.includes(to), false);
      assert.deepEqual(new Set(swapFreeTargets(before, to, from)), new Set(after));
      for (const original of defaults) {
        const roles = repairRoles(original, from);
        const snapshot = { ...roles };
        const swapped = repairRoles(roles, to, from);
        assert.deepEqual(new Set(Object.values(swapped)), new Set(after));
        assert.deepEqual(roles, snapshot);
      }
    }
  }
});

test('restored roles replace standby seats without changing other assignments', () => {
  assert.deepEqual(repairRoles(DEFAULT_DEBATE_ROLES, 'grok'), {
    pro: 'chatgpt', con: 'claude', judge: 'meta', summary: 'gemini',
  });
  assert.deepEqual(repairRoles(repairRoles(DEFAULT_CODING_ROLES, 'grok'), 'meta'), DEFAULT_CODING_ROLES);
});

test('free fanout excludes standby, unknown and duplicate targets and respects empty selection', () => {
  assert.deepEqual(selectedActiveTargets(ALL_PROVIDERS, 'meta'), activeProviders('meta'));
  assert.deepEqual(selectedActiveTargets(['grok', 'meta', 'meta', 'unknown'], 'grok'), ['meta']);
  assert.deepEqual(selectedActiveTargets([], 'meta'), []);
  assert.deepEqual(swapFreeTargets(['chatgpt'], 'grok', 'meta'), ['chatgpt']);
  assert.deepEqual(swapFreeTargets(['grok'], 'grok', 'meta'), ['meta']);
});

test('ready-only selection includes all Ready active providers and always excludes standby', () => {
  const connections = Object.fromEntries(ALL_PROVIDERS.map((provider) => [provider, { status: 'connected' as const }]));
  for (const standby of ALL_PROVIDERS) {
    assert.deepEqual(readyActiveTargets(connections, standby), activeProviders(standby));
  }
});

test('ready-only selection excludes checking, login-required, disconnected and unknown states', () => {
  const connections: Partial<Record<AIProvider, Pick<AIConnection, 'status'>>> = {
    chatgpt: { status: 'login-required' }, claude: { status: 'checking' },
    gemini: { status: 'disconnected' }, meta: { status: 'connected' },
  };
  assert.deepEqual(readyActiveTargets(connections, 'grok'), ['meta']);
  assert.deepEqual(readyActiveTargets(connections, 'meta'), []);
  assert.deepEqual(readyActiveTargets({}, 'grok'), []);
  connections.chatgpt = { status: 'connected' };
  assert.deepEqual(readyActiveTargets(connections, 'grok'), ['chatgpt', 'meta']);
});

test('ready-only targets remain a click-time snapshot and survive standby swaps', () => {
  const connections: Partial<Record<AIProvider, Pick<AIConnection, 'status'>>> = { meta: { status: 'connected' } };
  const targets = readyActiveTargets(connections, 'grok');
  connections.meta = { status: 'disconnected' };
  connections.chatgpt = { status: 'connected' };
  assert.deepEqual(targets, ['meta']);
  assert.deepEqual(readyActiveTargets(connections, 'grok'), ['chatgpt']);
  assert.deepEqual(selectedActiveTargets(targets, 'grok'), ['meta']);
  assert.deepEqual(swapFreeTargets(targets, 'meta', 'grok'), ['grok']);
});

test('ready-only shortcut and zero-ready explanation are translated in all five locales', () => {
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of ['targets.select_ready', 'targets.none_ready']) {
      const text = t(key, undefined, locale);
      assert.notEqual(text, key);
      if (locale !== 'en') assert.notEqual(text, t(key, undefined, 'en'));
    }
  }
});

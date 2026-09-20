import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_PROVIDERS,
  activeProviders,
  normalizeStandbyProvider,
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

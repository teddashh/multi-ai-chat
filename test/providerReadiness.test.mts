import assert from 'node:assert/strict';
import test from 'node:test';
import type { AIConnection, AIProvider, ChatMode } from '../src/shared/types.ts';
import { getProviderReadiness } from '../src/shared/providerReadiness.ts';
import { activeProviders, repairRoles, selectedActiveTargets } from '../src/shared/providerSelection.ts';
import { DEFAULT_DEBATE_ROLES, DEFAULT_CONSULT_ROLES } from '../src/shared/constants.ts';
import { decodeError, encodeError } from '../src/shared/errors.ts';
import { SUPPORTED_LOCALES, t } from '../src/shared/i18n.ts';

const connections: Partial<Record<AIProvider, Pick<AIConnection, 'status'>>> = {
  meta: { status: 'connected' },
  chatgpt: { status: 'login-required' },
  claude: { status: 'checking' },
  gemini: { status: 'disconnected' },
};

for (const [mode, defaults] of [['debate', DEFAULT_DEBATE_ROLES], ['consult', DEFAULT_CONSULT_ROLES]] as const) {
  test(`${mode} names all unready assigned providers when only Meta is ready`, () => {
    const roles = repairRoles(defaults, 'grok');
    const state = getProviderReadiness(mode, Object.values(roles), connections);
    assert.equal(state.canSend, false);
    assert.equal(state.noticeKey, 'error.providers_not_ready');
    assert.deepEqual(new Set(state.unready), new Set(['chatgpt', 'claude', 'gemini']));
    assert.deepEqual(state.ready, ['meta']);
  });
}

test('role reuse deduplicates blockers and ignores unassigned providers', () => {
  const state = getProviderReadiness('debate', ['meta', 'claude', 'claude', 'meta'], connections);
  assert.deepEqual(state.unready, ['claude']);
  assert.deepEqual(state.ready, ['meta']);
  assert.equal(state.canSend, false);
  const reassigned = getProviderReadiness('consult', ['meta', 'meta', 'meta', 'meta'], connections);
  assert.equal(reassigned.canSend, true);
  assert.equal(reassigned.noticeKey, undefined);
});

test('Free allows partial fanout and only warns about selected active providers', () => {
  const targets = selectedActiveTargets(['meta', 'grok', 'chatgpt', 'meta'], 'grok');
  const state = getProviderReadiness('free', targets, connections);
  assert.deepEqual(state.ready, ['meta']);
  assert.deepEqual(state.unready, ['chatgpt']);
  assert.equal(state.canSend, true);
  assert.equal(state.noticeKey, 'input.readiness.partial');
  assert.equal(getProviderReadiness('free', ['meta'], connections).noticeKey, undefined);
});

test('an unselected Ready provider cannot enable sending to unready targets', () => {
  const state = getProviderReadiness('free', ['chatgpt', 'claude'], connections);
  assert.equal(state.canSend, false);
  assert.equal(state.noticeKey, 'error.providers_not_ready');
  assert.deepEqual(state.unready, ['chatgpt', 'claude']);
});

test('all-ready workflows clear notices; empty selection and missing connections remain explicit', () => {
  const allReady = Object.fromEntries(activeProviders('meta').map((provider) => [provider, { status: 'connected' as const }]));
  for (const mode of ['free', 'debate', 'consult', 'coding', 'roundtable'] as ChatMode[]) {
    assert.equal(getProviderReadiness(mode, activeProviders('meta'), allReady).canSend, true);
    assert.equal(getProviderReadiness(mode, activeProviders('meta'), allReady).noticeKey, undefined);
  }
  assert.deepEqual(getProviderReadiness('free', [], connections), {
    ready: [], unready: [], canSend: false, noticeKey: 'error.no_selection',
  });
  assert.deepEqual(getProviderReadiness('free', ['grok'], connections).unready, ['grok']);
});

test('five locales translate named blockers/partial sends without dropping display names', () => {
  const params = { providers: 'ChatGPT · Claude · Gemini', ready: 'Meta AI' };
  const keys = ['error.providers_not_ready', 'error.no_selection', 'input.readiness.partial', 'workflow.free.partial'];
  for (const locale of SUPPORTED_LOCALES) {
    for (const key of keys) {
      const text = t(key, params, locale);
      assert.notEqual(text, key);
      assert.doesNotMatch(text, /\{\w+\}/);
      if (locale !== 'en') assert.notEqual(text, t(key, params, 'en'), `${locale}: ${key} must not fall back to English`);
      if (key !== 'error.no_selection') assert.ok(text.includes(params.providers));
      if (key.endsWith('.partial')) assert.ok(text.includes(params.ready));
    }
    // Existing stored error envelopes still decode and render without parameters.
    const legacy = decodeError(`Error: ${encodeError('error.no_target')}`)!;
    assert.notEqual(t(legacy.key, legacy.params, locale), legacy.key);
    assert.doesNotMatch(t(legacy.key, legacy.params, locale), /\{\w+\}/);
    const named = decodeError(`[Error: ${encodeError('error.providers_not_ready', params)}]`)!;
    assert.equal(t(named.key, named.params, locale), t('error.providers_not_ready', params, locale));
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { SUPPORTED_LOCALES, t } from '../src/shared/i18n.ts';
import {
  META_HOST_PERMISSION_DENIED_KEY,
  planMetaHostPermission,
} from '../src/sidepanel/metaHostPermission.ts';

test('a granted Meta permission request applies the standby change', () => {
  assert.deepEqual(
    planMetaHostPermission({ nextStandby: 'chatgpt', hasPermission: true, requested: true }),
    { action: 'apply' },
  );
});

test('a denied Meta permission request keeps the previous standby selection', () => {
  assert.deepEqual(
    planMetaHostPermission({ nextStandby: 'chatgpt', hasPermission: false, requested: true }),
    { action: 'keep', messageKey: META_HOST_PERMISSION_DENIED_KEY },
  );
});

test('access that is already granted does not prompt again', () => {
  assert.deepEqual(
    planMetaHostPermission({ nextStandby: 'gemini', hasPermission: true }),
    { action: 'apply' },
  );
});

test('switching the standby provider back to Meta does not prompt', () => {
  assert.deepEqual(
    planMetaHostPermission({ nextStandby: 'meta', hasPermission: false }),
    { action: 'apply' },
  );
  assert.deepEqual(
    planMetaHostPermission({ nextStandby: 'meta', hasPermission: false, requested: true }),
    { action: 'apply' },
  );
});

test('activating Meta without access asks for meta.ai before the standby change', () => {
  for (const nextStandby of ['chatgpt', 'claude', 'gemini', 'grok'] as const) {
    assert.deepEqual(
      planMetaHostPermission({ nextStandby, hasPermission: false }),
      { action: 'request' },
    );
  }
});

test('the Meta access denial message is translated in all five locales', () => {
  const english = t(META_HOST_PERMISSION_DENIED_KEY, undefined, 'en');
  assert.equal(english, 'Meta AI needs access to meta.ai. Access was not granted, so Meta AI stays on standby.');
  assert.match(english, /meta\.ai/);
  assert.match(english, /standby/);
  for (const locale of SUPPORTED_LOCALES) {
    const text = t(META_HOST_PERMISSION_DENIED_KEY, undefined, locale);
    assert.notEqual(text, META_HOST_PERMISSION_DENIED_KEY, locale);
    assert.doesNotMatch(text, /\{\w+\}/);
    if (locale !== 'en') assert.notEqual(text, english, `${locale} must not fall back to English`);
  }
});

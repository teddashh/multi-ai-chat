import assert from 'node:assert/strict';
import test from 'node:test';

import { decideLoginStatus, type LoginStatusState } from '../src/content/loginStatusStability.ts';

test('a ready composer reports connected immediately and only once', () => {
  const first = decideLoginStatus({}, {
    ready: true,
    explicitlyLoggedOut: false,
    now: 100,
    lossDelayMs: 2500,
  });
  assert.equal(first.report, true);
  assert.deepEqual(first.state, { reported: true });

  const duplicate = decideLoginStatus(first.state, {
    ready: true,
    explicitlyLoggedOut: false,
    now: 200,
    lossDelayMs: 2500,
  });
  assert.equal(duplicate.report, undefined);
});

test('a transient ChatGPT composer remount does not report a logout', () => {
  const connected: LoginStatusState = { reported: true };
  const missing = decideLoginStatus(connected, {
    ready: false,
    explicitlyLoggedOut: false,
    now: 1000,
    lossDelayMs: 2500,
  });
  assert.equal(missing.report, undefined);
  assert.equal(missing.retryInMs, 2500);

  const recovered = decideLoginStatus(missing.state, {
    ready: true,
    explicitlyLoggedOut: false,
    now: 2200,
    lossDelayMs: 2500,
  });
  assert.equal(recovered.report, undefined);
  assert.deepEqual(recovered.state, { reported: true });
});

test('a composer that stays missing reports login-required after the grace period', () => {
  const missing = decideLoginStatus({ reported: true }, {
    ready: false,
    explicitlyLoggedOut: false,
    now: 1000,
    lossDelayMs: 2500,
  });
  const expired = decideLoginStatus(missing.state, {
    ready: false,
    explicitlyLoggedOut: false,
    now: 3500,
    lossDelayMs: 2500,
  });
  assert.equal(expired.report, false);
  assert.deepEqual(expired.state, { reported: false });
});

test('explicit login controls report logged out without waiting', () => {
  const decision = decideLoginStatus({ reported: true }, {
    ready: true,
    explicitlyLoggedOut: true,
    now: 1000,
    lossDelayMs: 2500,
  });
  assert.equal(decision.report, false);
  assert.deepEqual(decision.state, { reported: false });
});

test('an initially unmounted composer stays checking before becoming login-required', () => {
  const initial = decideLoginStatus({}, {
    ready: false,
    explicitlyLoggedOut: false,
    now: 500,
    lossDelayMs: 2500,
  });
  assert.equal(initial.report, undefined);
  assert.equal(initial.retryInMs, 2500);

  const expired = decideLoginStatus(initial.state, {
    ready: false,
    explicitlyLoggedOut: false,
    now: 3000,
    lossDelayMs: 2500,
  });
  assert.equal(expired.report, false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { connectionForStatusReport } from '../src/background/providerTabOwnership.ts';
import { decideLoginStatus, type LoginStatusState } from '../src/content/loginStatusStability.ts';
import {
  isMetaGenerationActive,
  isMetaSendControl,
  metaLoginStatus,
} from '../src/content/metaDom.ts';
import type { AIConnection } from '../src/shared/types.ts';
import { control } from './metaControls.mts';

const META_LOGIN_LOSS_DELAY_MS = 2500;
const META_TAB_ID = 5;

type MetaComposer = ReturnType<typeof control>;

function isVisible(element: { visible?: boolean; closest(selector: string): unknown }): boolean {
  return element.visible !== false;
}

interface MetaDomState {
  composers?: readonly MetaComposer[];
  hasVisibleLoginButton?: boolean;
  hasVisibleLoginDialog?: boolean;
}

interface MetaStatusClock {
  now?: number;
  state?: LoginStatusState;
  connection?: AIConnection;
}

function reportMetaStatus(dom: MetaDomState, clock: MetaStatusClock = {}) {
  const login = metaLoginStatus(
    dom.composers ?? [],
    isVisible,
    dom.hasVisibleLoginButton ?? false,
    dom.hasVisibleLoginDialog ?? false,
  );
  // A false result is also an explicit logout in meta.ts, so null has to stay null.
  const decision = decideLoginStatus(clock.state ?? {}, {
    ready: login,
    explicitlyLoggedOut: login === false,
    now: clock.now ?? 0,
    lossDelayMs: META_LOGIN_LOSS_DELAY_MS,
  });
  const connection = clock.connection ?? { provider: 'meta', status: 'disconnected' };
  const reported = decision.report === undefined
    ? connection
    : connectionForStatusReport(connection, 'meta', META_TAB_ID, decision.report);
  return {
    login,
    report: decision.report,
    retryInMs: decision.retryInMs,
    status: reported.status,
    state: decision.state,
    connection: reported,
  };
}

test('a usable composer beside a visible login button and login dialog publishes connected', () => {
  const observed = reportMetaStatus({
    composers: [control()],
    hasVisibleLoginButton: true,
    hasVisibleLoginDialog: true,
  });
  assert.equal(observed.status, 'connected');
});

test('disabled, read-only, and aria-gated composers without login evidence stay checking', () => {
  // Desktop afeb315 forces logged_out when no usable composer exists. This extension
  // keeps 'checking' on purpose.
  for (const composer of [
    control({ disabled: true }),
    control({ readOnly: true }),
    control({ ancestor: '[aria-disabled="true"]' }),
    control({ ancestor: '[aria-readonly="true"]' }),
  ]) {
    const observed = reportMetaStatus({ composers: [composer] });
    assert.equal(observed.status, 'checking');
    assert.equal(observed.retryInMs, undefined);
  }
});

test('a hidden but otherwise usable composer without login evidence stays checking', () => {
  const observed = reportMetaStatus({ composers: [control({ visible: false })] });
  assert.equal(observed.status, 'checking');
  assert.equal(observed.retryInMs, undefined);
});

test('an inert composer publishes login-required immediately while generation is active', () => {
  const stop = control({ testId: 'composer-stop-button', visible: true });
  assert.equal(isMetaGenerationActive([stop], isVisible), true);
  const observed = reportMetaStatus({ composers: [control({ ancestor: '[inert]' })] });
  assert.equal(observed.status, 'login-required');
  assert.equal(observed.retryInMs, undefined);
});

test('repeated reports with no composer and no login evidence do not escalate checking into login-required as time passes', () => {
  // The 2500ms loss delay is unreachable for Meta: every false is explicitlyLoggedOut, so decideLoginStatus never takes the missingSince path.
  const quiet = {};
  const first = reportMetaStatus(quiet, { now: 0 });
  assert.equal(first.status, 'checking');
  assert.equal(first.retryInMs, undefined);

  const later = reportMetaStatus(quiet, {
    now: 3000,
    state: first.state,
    connection: first.connection,
  });
  assert.equal(later.status, 'checking');
  assert.equal(later.retryInMs, undefined);
});

test('a visible login button or login dialog with no composer publishes login-required', () => {
  for (const evidence of [
    { hasVisibleLoginButton: true },
    { hasVisibleLoginDialog: true },
  ]) {
    const observed = reportMetaStatus({ composers: [], ...evidence });
    assert.equal(observed.status, 'login-required');
    assert.equal(observed.retryInMs, undefined);
  }
});

test('a visible usable Send button with no composer stays checking', () => {
  // The desktop reports logged_out here; this extension reports checking because it can express "unknown".
  const send = control({ testId: 'composer-send-button', visible: true });
  assert.equal(isVisible(send), true);
  assert.equal(isMetaSendControl(send), true);
  const observed = reportMetaStatus({ composers: [] });
  assert.equal(observed.status, 'checking');
  assert.equal(observed.retryInMs, undefined);
});

test('a visible Stop button with no composer stays checking while generation is active', () => {
  // The desktop reports logged_out here; this extension reports checking because it can express "unknown".
  const stop = control({ testId: 'composer-stop-button', visible: true });
  assert.equal(isMetaGenerationActive([stop], isVisible), true);
  const observed = reportMetaStatus({ composers: [] });
  assert.equal(observed.status, 'checking');
  assert.equal(observed.retryInMs, undefined);
});

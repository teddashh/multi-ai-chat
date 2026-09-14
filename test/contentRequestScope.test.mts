import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isActiveContentRequest,
  shouldStopContentRequest,
} from '../src/shared/requestScope.ts';

test('cancelled and superseded content-script requests cannot resume after an await', () => {
  const oldRuntime = {};
  const newRuntime = {};
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, true, 'r1', 'r1'), true);
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, false, 'r1', 'r1'), false);
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, true, 'r2', 'r1'), false);
  assert.equal(isActiveContentRequest(false, oldRuntime, newRuntime, true, 'r1', 'r1'), false);
  assert.equal(isActiveContentRequest(true, oldRuntime, oldRuntime, true, 'r1', 'r1'), false);
});

test('an exact scoped STOP can clean up a settled failed request tombstone', () => {
  assert.equal(shouldStopContentRequest(
    false,
    undefined,
    undefined,
    'failed-request',
    'workflow-1',
    'failed-request',
    'workflow-1',
  ), true);
  assert.equal(shouldStopContentRequest(
    false,
    undefined,
    undefined,
    'failed-request',
    'workflow-1',
    'other-request',
    'workflow-1',
  ), false);
});

test('a failed-request tombstone can never authorize STOP against a newer active request', () => {
  assert.equal(shouldStopContentRequest(
    true,
    'new-request',
    'workflow-2',
    'failed-request',
    'workflow-1',
    'failed-request',
    'workflow-1',
  ), false);
  assert.equal(shouldStopContentRequest(
    true,
    'new-request',
    'workflow-2',
    'failed-request',
    'workflow-1',
    'new-request',
    'workflow-2',
  ), true);
});

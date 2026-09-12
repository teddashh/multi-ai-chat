import assert from 'node:assert/strict';
import test from 'node:test';

import { isActiveContentRequest } from '../src/shared/requestScope.ts';

test('cancelled and superseded content-script requests cannot resume after an await', () => {
  const oldRuntime = {};
  const newRuntime = {};
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, true, 'r1', 'r1'), true);
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, false, 'r1', 'r1'), false);
  assert.equal(isActiveContentRequest(false, oldRuntime, oldRuntime, true, 'r2', 'r1'), false);
  assert.equal(isActiveContentRequest(false, oldRuntime, newRuntime, true, 'r1', 'r1'), false);
  assert.equal(isActiveContentRequest(true, oldRuntime, oldRuntime, true, 'r1', 'r1'), false);
});

// Uses Node's built-in node:test and native type stripping (Node 22.18+).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AIConnection } from '../src/shared/types.ts';
import { getProviderFromUrl } from '../src/shared/providerUrl.ts';
import {
  canRetryStatusProbe,
  compareProviderTabPriority,
  connectionAfterProbeFailure,
  connectionAfterRefresh,
  connectionAfterTabRelease,
  connectionForStatusReport,
  connectionForTabEvent,
  isProviderTabUnavailable,
  providerForTabEvent,
  sameConnection,
} from '../src/background/providerTabOwnership.ts';

const connected = (tabId: number): AIConnection => ({ provider: 'chatgpt', status: 'connected', tabId });

test('live tabs outrank frozen or discarded candidates even when those are active', () => {
  const candidates = [
    { id: 11, active: true, frozen: true, lastAccessed: 300 },
    { id: 22, active: false, discarded: false, lastAccessed: 100 },
    { id: 33, active: false, discarded: true, lastAccessed: 400 },
  ].sort(compareProviderTabPriority);
  assert.deepEqual(candidates.map((candidate) => candidate.id), [22, 11, 33]);
  assert.equal(isProviderTabUnavailable(candidates[0]), false);
  assert.equal(isProviderTabUnavailable(candidates[1]), true);
});

test('a status-only event with an external tab URL releases the incumbent provider', () => {
  assert.equal(providerForTabEvent(undefined, 'https://example.com/', 'chatgpt', getProviderFromUrl), undefined);
});

test('a status-only event falls back to the incumbent when Chrome omits both URLs', () => {
  assert.equal(providerForTabEvent(undefined, undefined, 'chatgpt', getProviderFromUrl), 'chatgpt');
});

test('an empty pre-commit tab URL does not release the incumbent during loading', () => {
  assert.equal(providerForTabEvent(undefined, '', 'chatgpt', getProviderFromUrl), 'chatgpt');
  assert.equal(providerForTabEvent('', 'https://chatgpt.com/c/active', 'chatgpt', getProviderFromUrl), 'chatgpt');
});

test('an explicit changed URL takes precedence over the tab snapshot URL', () => {
  assert.equal(
    providerForTabEvent('https://claude.ai/new', 'https://chatgpt.com/c/old', 'chatgpt', getProviderFromUrl),
    'claude',
  );
});

test('refresh preserves a valid incumbent even when another ChatGPT tab appears first', () => {
  const incumbent = connected(11);
  assert.strictEqual(
    connectionAfterRefresh(incumbent, 'chatgpt', incumbent, [22, 11]),
    incumbent,
  );
});

test('refresh replaces an incumbent only after its tab is no longer a candidate', () => {
  const incumbent = connected(11);
  assert.deepEqual(
    connectionAfterRefresh(incumbent, 'chatgpt', incumbent, [22]),
    { provider: 'chatgpt', status: 'checking', tabId: 22 },
  );
});

test('refresh replaces an unavailable incumbent with a live candidate', () => {
  const incumbent = connected(11);
  assert.deepEqual(
    connectionAfterRefresh(incumbent, 'chatgpt', incumbent, [22, 11], [11]),
    { provider: 'chatgpt', status: 'checking', tabId: 22 },
  );
});

test('refresh retains the only unavailable tab as a wakeable disconnected target', () => {
  const incumbent = connected(11);
  assert.deepEqual(
    connectionAfterRefresh(incumbent, 'chatgpt', incumbent, [11], [11]),
    { provider: 'chatgpt', status: 'disconnected', tabId: 11 },
  );
});

test('a non-owner tab cannot steal ownership through updates or status reports', () => {
  const checking: AIConnection = { provider: 'chatgpt', status: 'checking', tabId: 11 };
  assert.strictEqual(connectionForTabEvent(checking, 'chatgpt', 22, true), checking);
  assert.strictEqual(connectionForStatusReport(checking, 'chatgpt', 22, true), checking);
});

test('a frozen or discarded sender cannot reclaim ownership through a queued status report', () => {
  const released: AIConnection = { provider: 'chatgpt', status: 'disconnected' };
  assert.strictEqual(
    connectionForStatusReport(released, 'chatgpt', 11, true, true),
    released,
  );
});

test('URL-only SPA navigation keeps a ready owner connected', () => {
  const incumbent = connected(11);
  assert.strictEqual(connectionForTabEvent(incumbent, 'chatgpt', 11, false), incumbent);
  assert.deepEqual(
    connectionForTabEvent(incumbent, 'chatgpt', 11, true),
    { provider: 'chatgpt', status: 'checking', tabId: 11 },
  );
});

test('a stale probe failure cannot disconnect a newer owner', () => {
  const newerOwner = connected(22);
  assert.strictEqual(connectionAfterProbeFailure(newerOwner, 'chatgpt', 11), newerOwner);
});

test('a stale focus failure cannot release a newer owner', () => {
  const newerOwner = connected(22);
  assert.strictEqual(connectionAfterTabRelease(newerOwner, 'chatgpt', 11), newerOwner);
});

test('a transient SPA probe failure can preserve the connected owner', () => {
  const incumbent = connected(11);
  assert.strictEqual(connectionAfterProbeFailure(incumbent, 'chatgpt', 11, true), incumbent);
  assert.deepEqual(
    connectionAfterProbeFailure(incumbent, 'chatgpt', 11),
    { provider: 'chatgpt', status: 'disconnected', tabId: 11 },
  );
});

test('releasing a closed or navigated-away owner allows a remaining tab to be selected', () => {
  const released = connectionAfterTabRelease(connected(11), 'chatgpt', 11);
  assert.deepEqual(released, { provider: 'chatgpt', status: 'disconnected' });
  assert.deepEqual(
    connectionAfterRefresh(released, 'chatgpt', released, [22]),
    { provider: 'chatgpt', status: 'checking', tabId: 22 },
  );
});

test('an old refresh snapshot cannot replace ownership claimed while tabs.query was pending', () => {
  const refreshStart: AIConnection = { provider: 'chatgpt', status: 'disconnected' };
  const newlyClaimed = connected(22);
  assert.strictEqual(
    connectionAfterRefresh(newlyClaimed, 'chatgpt', refreshStart, [11]),
    newlyClaimed,
  );
});

test('an old refresh cannot overwrite a released and reclaimed owner with the same tab id', () => {
  const oldGeneration = connected(11);
  const newGeneration = connected(11);
  assert.strictEqual(
    connectionAfterRefresh(newGeneration, 'chatgpt', oldGeneration, []),
    newGeneration,
  );
});

test('a preserved SPA failure retries only while the same owner remains connected', () => {
  const incumbent = connected(11);
  const afterFirstFailure = connectionAfterProbeFailure(incumbent, 'chatgpt', 11, true);
  assert.strictEqual(afterFirstFailure, incumbent);
  assert.equal(canRetryStatusProbe(afterFirstFailure, 11), true);
  assert.deepEqual(
    connectionAfterProbeFailure(afterFirstFailure, 'chatgpt', 11),
    { provider: 'chatgpt', status: 'disconnected', tabId: 11 },
  );
  assert.equal(canRetryStatusProbe(connected(22), 11), false);
  assert.equal(canRetryStatusProbe({ provider: 'chatgpt', status: 'checking', tabId: 11 }, 11), false);
});

test('connection equality detects whether a broadcast would carry a state change', () => {
  assert.equal(sameConnection(connected(11), connected(11)), true);
  assert.equal(sameConnection(connected(11), connected(22)), false);
  assert.equal(sameConnection(connected(11), { provider: 'chatgpt', status: 'checking', tabId: 11 }), false);
});

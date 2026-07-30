// Uses Node's built-in node:test — no test framework dependency. Runs the TypeScript sources
// directly, which needs Node 22.6+ native type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { longerResponseText } from '../src/content/responseSerializer.ts';

// Why this matters: ChatGPT's "still generating" signal (the stop button) ends before the last
// render commits. Finalizing with only the text cached mid-stream hands the user half an answer,
// and that half is fed verbatim into the next provider's prompt.
test('a fuller re-read wins over the text cached mid-stream', () => {
  assert.equal(longerResponseText('first line', 'first line\nsecond\nthird'), 'first line\nsecond\nthird');
});

test('keeps the cache when the re-read finds nothing, so we never ship an empty response', () => {
  assert.equal(longerResponseText('complete answer', null), 'complete answer');
  assert.equal(longerResponseText('complete answer', ''), 'complete answer');
});

test('keeps the cache when the re-read is shorter, in case finalizing races a re-render', () => {
  assert.equal(longerResponseText('complete answer', 'compl'), 'complete answer');
});

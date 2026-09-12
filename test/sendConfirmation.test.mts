import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearedComposerConfirmsSend,
  contentMatchesPrompt,
} from '../src/content/sendConfirmation.ts';

test('an empty replacement composer does not falsely confirm a send', () => {
  const detachedComposer = {};
  const emptyReplacement = {};
  assert.equal(
    clearedComposerConfirmsSend(detachedComposer, emptyReplacement, true, false),
    false,
  );
});

test('the same cleared composer or a matching user turn confirms a send', () => {
  const composer = {};
  assert.equal(clearedComposerConfirmsSend(composer, composer, true, false), true);
  assert.equal(clearedComposerConfirmsSend({}, {}, true, true), true);
});

test('user-turn matching is exact after normalizing formatting whitespace', () => {
  assert.equal(contentMatchesPrompt('Explain\n this   result', 'Explain this result'), true);
  assert.equal(contentMatchesPrompt('Prefix: Explain this result', 'Explain this result'), false);
  assert.equal(contentMatchesPrompt('An older message', 'New prompt'), false);
});

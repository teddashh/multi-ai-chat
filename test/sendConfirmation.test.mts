import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearedComposerConfirmsSend,
  contentMatchesPrompt,
  matchingPromptCount,
} from '../src/content/sendConfirmation.ts';

test('an empty replacement composer does not falsely confirm a send', () => {
  const detachedComposer = {};
  const emptyReplacement = {};
  assert.equal(
    clearedComposerConfirmsSend(detachedComposer, emptyReplacement, true, false),
    false,
  );
});

test('matching user-turn counts survive remounts and advance only for a retry turn', () => {
  const prompt = 'same retry prompt';
  const before = matchingPromptCount(['older prompt', prompt], prompt);
  const remounted = matchingPromptCount(['older prompt', prompt], prompt);
  const retried = matchingPromptCount(['older prompt', prompt, prompt], prompt);

  assert.equal(remounted, before);
  assert.equal(retried, before + 1);
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

test('user-turn matching accepts the visible rendering of a Markdown prompt', () => {
  const prompt = '# Review\nUse **the source** at [Docs](https://example.com/docs).\n```ts\nconst ready = true;\n```';
  const rendered = 'Review\nUse the source at Docs.\nconst ready = true;';

  assert.equal(contentMatchesPrompt(rendered, prompt), true);
});

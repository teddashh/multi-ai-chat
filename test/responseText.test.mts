// Uses Node's built-in node:test — no test framework dependency. Runs the TypeScript sources
// directly, which needs Node 22.6+ native type stripping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { longerResponseText, serializeResponseText } from '../src/content/responseSerializer.ts';

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

// Code blocks are swapped for a placeholder and restored at the end. If that restore uses a
// string replacement, the `$&`, `$'` and `` $` `` that show up in ordinary shell snippets are
// expanded by String.replace as substitution patterns. The user gets rewritten code that still
// looks plausible — the hardest kind of corruption to notice.
test("code blocks containing $& / $' / $` are restored verbatim", () => {
  const code = "echo \"$&\" && echo '$`' && echo \"$'\" && echo \"$1\"";
  const root = element('DIV', [element('PRE', [element('CODE', [text(code)], { class: 'language-bash' })])]);
  assert.equal(serializeResponseText(root), '```bash\n' + code + '\n```');
});

// serializeResponseText only touches nodeType / tagName / childNodes / textContent /
// getAttribute, so these few fields are enough — no DOM implementation needed.
function text(value: string) {
  return { nodeType: 3, textContent: value };
}

function element(tagName: string, childNodes: unknown[], attrs: Record<string, string> = {}) {
  return {
    nodeType: 1,
    tagName,
    childNodes,
    textContent: childNodes.map((child) => (child as { textContent: string }).textContent).join(''),
    getAttribute: (name: string) => attrs[name] ?? null,
  };
}

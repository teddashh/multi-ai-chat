import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  META_INPUT_SELECTORS,
  META_RESPONSE_SELECTORS,
  META_STOP_SELECTORS,
} from '../src/content/metaDom.ts';

const probe = readFileSync(new URL('../store/META-AI-STEP3-PROBE.js', import.meta.url), 'utf8');

test('the Step3 probe keeps the Meta selector lists and reads page text only as a length', () => {
  for (const selector of [...META_INPUT_SELECTORS, ...META_STOP_SELECTORS, ...META_RESPONSE_SELECTORS]) {
    assert.equal(probe.includes(selector), true, `probe is missing ${selector}`);
  }

  for (const forbidden of ['innerHTML', 'outerHTML', 'innerText']) {
    assert.equal(probe.includes(forbidden), false, `probe contains ${forbidden}`);
  }

  // The probe must never exfiltrate page text. Each textContent read is allowed
  // only as a length measurement, so a raw capture fails this window.
  const needle = 'textContent';
  const lengthWindow = 32;
  let reads = 0;
  for (let from = 0; from < probe.length;) {
    const at = probe.indexOf(needle, from);
    if (at < 0) break;
    reads += 1;
    const after = probe.slice(at + needle.length, at + needle.length + lengthWindow);
    assert.equal(after.includes('.length'), true, `textContent at index ${at} is not length-only`);
    from = at + needle.length;
  }
  assert.equal(reads > 0, true);
});

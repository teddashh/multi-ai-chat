// Uses Node's built-in node:test and native type stripping (Node 22.18+).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProviderFromUrl } from '../src/shared/providerUrl.ts';

test('maps only the exact HTTPS provider hosts', () => {
  assert.equal(getProviderFromUrl('https://chatgpt.com/c/123'), 'chatgpt');
  assert.equal(getProviderFromUrl('https://chat.openai.com/?model=gpt'), 'chatgpt');
  assert.equal(getProviderFromUrl('https://claude.ai/new'), 'claude');
  assert.equal(getProviderFromUrl('https://gemini.google.com/app'), 'gemini');
  assert.equal(getProviderFromUrl('https://grok.com/'), 'grok');
});

test('does not trust provider names in an attacker-controlled URL', () => {
  const untrusted = [
    'https://evil.example/?next=https://chatgpt.com/',
    'https://chatgpt.com.evil.example/',
    'https://evil-chatgpt.com/',
    'https://chatgpt.com@evil.example/',
    'https://evil.example/gemini.google.com/',
    'https://grok.com.evil.example/',
  ];

  for (const value of untrusted) assert.equal(getProviderFromUrl(value), null, value);
});

test('rejects unsupported protocols, subdomains, and malformed values', () => {
  const unsupported = [
    'http://chatgpt.com/',
    'javascript:location.href="https://claude.ai"',
    'https://www.claude.ai/',
    'not a URL containing grok.com',
    '',
  ];

  for (const value of unsupported) assert.equal(getProviderFromUrl(value), null, value);
});

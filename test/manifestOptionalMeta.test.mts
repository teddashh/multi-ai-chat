import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { META_ORIGINS } from '../src/shared/metaOrigins.ts';

interface ManifestContentScript {
  matches: string[];
  js: string[];
  run_at: string;
}

interface ExtensionManifest {
  version: string;
  permissions: string[];
  host_permissions: string[];
  optional_host_permissions: string[];
  content_scripts: ManifestContentScript[];
}

test('manifest keeps meta host access optional, matches package.json, and the other content scripts in place', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8')) as ExtensionManifest;
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.permissions.includes('scripting'), true);
  assert.deepEqual(manifest.host_permissions, [
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://grok.com/*',
    'https://api.hackmd.io/*',
  ]);
  for (const origin of META_ORIGINS) {
    assert.equal(manifest.host_permissions.includes(origin), false, origin);
  }
  assert.equal(manifest.host_permissions.some((pattern) => pattern.includes('meta.ai')), false);
  assert.deepEqual(manifest.optional_host_permissions, [...META_ORIGINS]);
  for (const entry of manifest.content_scripts) {
    assert.equal(entry.js.includes('content/meta.js'), false);
    assert.equal(entry.matches.some((match) => match.includes('meta.ai')), false);
  }
  assert.deepEqual(manifest.content_scripts, [
    { matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'], js: ['content/chatgpt.js'], run_at: 'document_idle' },
    { matches: ['https://claude.ai/*'], js: ['content/claude.js'], run_at: 'document_idle' },
    { matches: ['https://gemini.google.com/*'], js: ['content/gemini.js'], run_at: 'document_idle' },
    { matches: ['https://grok.com/*'], js: ['content/grok.js'], run_at: 'document_idle' },
  ]);
});

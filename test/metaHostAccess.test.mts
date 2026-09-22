import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { includesMetaOrigin, META_ORIGINS } from '../src/shared/metaOrigins.ts';
import type { MetaDynamicContentScript, MetaHostAccessDeps } from '../src/background/metaHostAccess.ts';

// Node cannot resolve this module's extensionless shared import. Transpile it the
// same way the service-worker test does, without changing production resolution.
function loadMetaHostAccess(): {
  META_CONTENT_SCRIPT_ID: string;
  metaContentScript: () => MetaDynamicContentScript;
  syncMetaHostAccess: (deps: MetaHostAccessDeps) => Promise<{
    action: 'registered' | 'unchanged' | 'unregistered' | 'absent';
    scriptId: string;
  }>;
} {
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (file: string): Record<string, unknown> => {
    const cached = cache.get(file);
    if (cached) return cached.exports;
    const module = { exports: {} as Record<string, unknown> };
    cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const run = vm.runInThisContext(
      `(function(require, module, exports) {${code}\n})`,
      { filename: file },
    ) as (
      require: (specifier: string) => Record<string, unknown>,
      module: { exports: Record<string, unknown> },
      exports: Record<string, unknown>,
    ) => void;
    run((specifier: string) => {
      if (!specifier.startsWith('.')) throw new Error(`Unexpected dependency: ${specifier}`);
      return load(path.resolve(path.dirname(file), specifier.endsWith('.ts') ? specifier : `${specifier}.ts`));
    }, module, module.exports);
    return module.exports;
  };
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return load(path.resolve(testDir, '../src/background/metaHostAccess.ts')) as ReturnType<typeof loadMetaHostAccess>;
}

const {
  META_CONTENT_SCRIPT_ID,
  metaContentScript,
  syncMetaHostAccess,
} = loadMetaHostAccess();

interface FakeRegistration {
  permitted: boolean;
  scripts: { id: string }[];
  registered: MetaDynamicContentScript[];
  unregistered: string[][];
  order: string[];
}

function fakeAccess(initial: { id: string }[] = [], permitted = false): FakeRegistration & { deps: MetaHostAccessDeps } {
  const state: FakeRegistration = {
    permitted,
    scripts: initial.map((script) => ({ ...script })),
    registered: [],
    unregistered: [],
    order: [],
  };
  const deps: MetaHostAccessDeps = {
    hasPermission: async () => {
      state.order.push('permission');
      return state.permitted;
    },
    getRegistered: async () => {
      state.order.push('read');
      return state.scripts.map((script) => ({ ...script }));
    },
    register: async (script) => {
      state.order.push('register');
      if (state.scripts.some((existing) => existing.id === script.id)) {
        throw new Error(`Duplicate script ID '${script.id}'`);
      }
      state.scripts.push({ id: script.id });
      state.registered.push(script);
    },
    unregister: async (ids) => {
      state.order.push('unregister');
      state.unregistered.push([...ids]);
      state.scripts = state.scripts.filter((script) => !ids.includes(script.id));
    },
  };
  return {
    get permitted() { return state.permitted; },
    set permitted(value: boolean) { state.permitted = value; },
    get scripts() { return state.scripts; },
    get registered() { return state.registered; },
    get unregistered() { return state.unregistered; },
    get order() { return state.order; },
    deps,
  };
}

test('registers the persistent Meta content script when access is granted and it is not registered', async () => {
  const fake = fakeAccess();
  fake.permitted = true;
  const result = await syncMetaHostAccess(fake.deps);
  assert.deepEqual(result, { action: 'registered', scriptId: META_CONTENT_SCRIPT_ID });
  assert.deepEqual(fake.order, ['permission', 'read', 'register']);
  assert.deepEqual(fake.registered, [metaContentScript()]);
  assert.equal(fake.registered[0].persistAcrossSessions, true);
  assert.deepEqual(fake.registered[0].matches, [...META_ORIGINS]);
  assert.deepEqual(fake.unregistered, []);
});

test('does not register twice when the Meta script is already registered', async () => {
  const fake = fakeAccess();
  fake.permitted = true;
  await syncMetaHostAccess(fake.deps);
  const again = await syncMetaHostAccess(fake.deps);
  assert.deepEqual(again, { action: 'unchanged', scriptId: META_CONTENT_SCRIPT_ID });
  assert.equal(fake.registered.length, 1);
  assert.deepEqual(fake.order, ['permission', 'read', 'register', 'permission', 'read']);
});

test('unregisters only the Meta script when access is gone', async () => {
  const fake = fakeAccess([
    { id: 'chatgpt' },
    { id: META_CONTENT_SCRIPT_ID },
    { id: 'grok' },
  ]);
  const result = await syncMetaHostAccess(fake.deps);
  assert.deepEqual(result, { action: 'unregistered', scriptId: META_CONTENT_SCRIPT_ID });
  assert.deepEqual(fake.unregistered, [[META_CONTENT_SCRIPT_ID]]);
  assert.deepEqual(fake.scripts.map((script) => script.id), ['chatgpt', 'grok']);
  assert.deepEqual(fake.registered, []);
});

test('leaves other providers registered when Meta access is absent and Meta was not registered', async () => {
  const fake = fakeAccess([{ id: 'chatgpt' }, { id: 'claude' }]);
  const result = await syncMetaHostAccess(fake.deps);
  assert.deepEqual(result, { action: 'absent', scriptId: META_CONTENT_SCRIPT_ID });
  assert.deepEqual(fake.order, ['permission', 'read']);
  assert.deepEqual(fake.scripts.map((script) => script.id), ['chatgpt', 'claude']);
});

test('registration and permission failures propagate', async () => {
  await assert.rejects(
    syncMetaHostAccess({
      hasPermission: async () => true,
      getRegistered: async () => [],
      register: async () => { throw new Error('register failed'); },
      unregister: async () => { throw new Error('unregister should not run'); },
    }),
    /register failed/,
  );
  await assert.rejects(
    syncMetaHostAccess({
      hasPermission: async () => { throw new Error('permission failed'); },
      getRegistered: async () => [],
      register: async () => {},
      unregister: async () => {},
    }),
    /permission failed/,
  );
});

test('meta origin matching is exact and does not treat lookalike hosts as Meta', () => {
  assert.equal(includesMetaOrigin([...META_ORIGINS]), true);
  assert.equal(includesMetaOrigin(['https://www.meta.ai/*']), true);
  assert.equal(includesMetaOrigin(['https://meta.ai/*']), true);
  assert.equal(includesMetaOrigin(undefined), false);
  assert.equal(includesMetaOrigin([]), false);
  assert.equal(includesMetaOrigin(['https://api.hackmd.io/*']), false);
  assert.equal(includesMetaOrigin(['https://www.meta.ai.evil.example/*']), false);
  assert.equal(includesMetaOrigin(['https://evil-meta.ai/*']), false);
});

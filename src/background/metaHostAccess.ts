import { META_ORIGINS } from '../shared/metaOrigins';

/** Match patterns for the dynamically registered Meta content script. */
export const META_CONTENT_SCRIPT_MATCHES = META_ORIGINS;

export const META_CONTENT_SCRIPT_ID = 'meta-ai';
export const META_CONTENT_SCRIPT_FILE = 'content/meta.js';

export interface MetaDynamicContentScript {
  id: string;
  matches: string[];
  js: string[];
  runAt: 'document_idle';
  persistAcrossSessions: true;
}

export function metaContentScript(): MetaDynamicContentScript {
  return {
    id: META_CONTENT_SCRIPT_ID,
    matches: [...META_CONTENT_SCRIPT_MATCHES],
    js: [META_CONTENT_SCRIPT_FILE],
    runAt: 'document_idle',
    persistAcrossSessions: true,
  };
}

export interface MetaHostAccessDeps {
  hasPermission: () => Promise<boolean>;
  getRegistered: () => Promise<readonly { id: string }[]>;
  register: (script: MetaDynamicContentScript) => Promise<void>;
  unregister: (ids: readonly string[]) => Promise<void>;
}

export interface MetaHostAccessSyncResult {
  action: 'registered' | 'unchanged' | 'unregistered' | 'absent';
  scriptId: string;
}

/**
 * Make the dynamic Meta content script match the current host permission.
 * Callers must check existing registrations first: registerContentScripts rejects a duplicate id.
 * Unregister only the script this module owns.
 */
export async function syncMetaHostAccess(deps: MetaHostAccessDeps): Promise<MetaHostAccessSyncResult> {
  const permitted = await deps.hasPermission();
  const registered = await deps.getRegistered();
  const ownsScript = registered.some((script) => script.id === META_CONTENT_SCRIPT_ID);
  if (permitted) {
    if (ownsScript) return { action: 'unchanged', scriptId: META_CONTENT_SCRIPT_ID };
    await deps.register(metaContentScript());
    return { action: 'registered', scriptId: META_CONTENT_SCRIPT_ID };
  }
  if (!ownsScript) return { action: 'absent', scriptId: META_CONTENT_SCRIPT_ID };
  await deps.unregister([META_CONTENT_SCRIPT_ID]);
  return { action: 'unregistered', scriptId: META_CONTENT_SCRIPT_ID };
}

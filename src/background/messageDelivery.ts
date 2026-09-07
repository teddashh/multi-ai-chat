interface ContentScriptResult {
  ok?: unknown;
  error?: unknown;
}

export function assertContentScriptAccepted(result: unknown): void {
  if (!result || typeof result !== 'object') return;
  const response = result as ContentScriptResult;
  if (response.ok !== false) return;
  const message = typeof response.error === 'string' && response.error
    ? response.error
    : 'The provider content script rejected the message';
  throw new Error(message);
}

import type { AIConnection, AIProvider, ChatMode } from './types';

// Only selected targets / assigned roles matter; duplicate roles name an AI once.
export function getProviderReadiness(
  mode: ChatMode,
  selected: readonly AIProvider[],
  connections: Partial<Record<AIProvider, Pick<AIConnection, 'status'>>>,
) {
  const providers = [...new Set(selected)];
  const ready = providers.filter((provider) => connections[provider]?.status === 'connected');
  const unready = providers.filter((provider) => connections[provider]?.status !== 'connected');
  const canSend = ready.length > 0 && (mode === 'free' || unready.length === 0);
  const noticeKey = providers.length === 0 ? 'error.no_selection'
    : unready.length === 0 ? undefined
    : canSend ? 'input.readiness.partial' : 'error.providers_not_ready';
  return { ready, unready, canSend, noticeKey };
}

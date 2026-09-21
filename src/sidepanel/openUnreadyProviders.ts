import type { AIConnection, AIProvider } from '../shared/types';

export async function openUnreadyProviders(
  selected: readonly AIProvider[],
  standbyProvider: AIProvider,
  connections: Partial<Record<AIProvider, Pick<AIConnection, 'status'>>>,
  openLogin: (provider: AIProvider) => Promise<void>,
): Promise<AIProvider[]> {
  const pending = [...new Set(selected)].filter((provider) =>
    provider !== standbyProvider && connections[provider]?.status !== 'connected');
  // A failed tab must not prevent the other selected providers from opening.
  const results = await Promise.allSettled(pending.map(async (provider) => openLogin(provider)));
  return pending.filter((_, index) => results[index].status === 'rejected');
}

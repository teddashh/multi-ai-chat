import type { AIConnection, AIProvider } from '../shared/types';

interface ProviderTabAvailability {
  active?: boolean;
  discarded?: boolean;
  frozen?: boolean;
  lastAccessed?: number;
}

export function isProviderTabUnavailable(tab: ProviderTabAvailability): boolean {
  return Boolean(tab.discarded || tab.frozen);
}

export function compareProviderTabPriority(
  first: ProviderTabAvailability,
  second: ProviderTabAvailability,
): number {
  return Number(isProviderTabUnavailable(first)) - Number(isProviderTabUnavailable(second))
    || Number(Boolean(second.active)) - Number(Boolean(first.active))
    || (second.lastAccessed ?? 0) - (first.lastAccessed ?? 0);
}

export function providerForTabEvent(
  changedUrl: string | undefined,
  tabUrl: string | undefined,
  incumbent: AIProvider | undefined,
  providerFromUrl: (url: string) => AIProvider | null,
): AIProvider | undefined {
  const observedUrl = [changedUrl, tabUrl].find((value) => Boolean(value?.trim()));
  return observedUrl === undefined ? incumbent : providerFromUrl(observedUrl) ?? undefined;
}

export function sameConnection(first: AIConnection, second: AIConnection): boolean {
  return first.provider === second.provider
    && first.status === second.status
    && first.tabId === second.tabId;
}

/**
 * A provider keeps its incumbent tab until that tab is explicitly released.
 * Events from another tab must not silently redirect subsequent prompts.
 */
export function connectionForTabEvent(
  current: AIConnection,
  provider: AIProvider,
  tabId: number,
  markChecking: boolean,
): AIConnection {
  if (current.tabId !== undefined && current.tabId !== tabId) return current;
  if (current.tabId === tabId && !markChecking) return current;
  return { provider, status: 'checking', tabId };
}

export function connectionForStatusReport(
  current: AIConnection,
  provider: AIProvider,
  tabId: number,
  loggedIn: boolean,
  unavailable = false,
): AIConnection {
  if (unavailable) return current;
  if (current.tabId !== undefined && current.tabId !== tabId) return current;
  return {
    provider,
    status: loggedIn ? 'connected' : 'login-required',
    tabId,
  };
}

export function connectionAfterProbeFailure(
  current: AIConnection,
  provider: AIProvider,
  tabId: number,
  preserveConnected = false,
): AIConnection {
  if (current.tabId !== tabId) return current;
  if (preserveConnected && current.status === 'connected') return current;
  return { provider, status: 'disconnected', tabId };
}

export function connectionAfterTabRelease(
  current: AIConnection,
  provider: AIProvider,
  tabId: number,
): AIConnection {
  if (current.tabId !== tabId) return current;
  return { provider, status: 'disconnected' };
}

/**
 * Reconcile a tabs.query snapshot without letting an old async refresh replace an
 * owner that was selected while the query was in flight.
 */
export function connectionAfterRefresh(
  current: AIConnection,
  provider: AIProvider,
  connectionAtRefreshStart: AIConnection,
  candidateTabIds: readonly number[],
  unavailableCandidateTabIds: readonly number[] = [],
): AIConnection {
  if (current !== connectionAtRefreshStart) return current;
  const unavailable = new Set(unavailableCandidateTabIds);
  if (current.tabId !== undefined
    && candidateTabIds.includes(current.tabId)
    && !unavailable.has(current.tabId)) {
    return current;
  }
  const liveCandidate = candidateTabIds.find((tabId) => !unavailable.has(tabId));
  if (liveCandidate !== undefined) return { provider, status: 'checking', tabId: liveCandidate };
  const unavailableCandidate = current.tabId !== undefined && candidateTabIds.includes(current.tabId)
    ? current.tabId
    : candidateTabIds[0];
  return unavailableCandidate === undefined
    ? { provider, status: 'disconnected' }
    : { provider, status: 'disconnected', tabId: unavailableCandidate };
}

export function canRetryStatusProbe(current: AIConnection, tabId: number): boolean {
  return current.tabId === tabId && current.status === 'connected';
}

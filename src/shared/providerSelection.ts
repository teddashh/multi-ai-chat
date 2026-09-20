import type { AIProvider, ModeRoles } from './types';

export const ALL_PROVIDERS: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok', 'meta'];
export const DEFAULT_STANDBY_PROVIDER: AIProvider = 'meta';

export function normalizeStandbyProvider(value: unknown): AIProvider {
  return ALL_PROVIDERS.includes(value as AIProvider) ? value as AIProvider : DEFAULT_STANDBY_PROVIDER;
}

export function activeProviders(standby: AIProvider): AIProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider !== standby);
}

export function selectedActiveTargets(value: unknown, standby: AIProvider): AIProvider[] {
  const active = activeProviders(standby);
  if (!Array.isArray(value)) return active;
  return [...new Set(value.filter((provider): provider is AIProvider => active.includes(provider)))];
}

export function swapFreeTargets(value: unknown, standby: AIProvider, previousStandby: AIProvider): AIProvider[] {
  const previous = selectedActiveTargets(value, previousStandby);
  return selectedActiveTargets(previous.map((provider) => provider === standby ? previousStandby : provider), standby);
}

export function repairRoles<T extends ModeRoles>(roles: T, standby: AIProvider, previousStandby?: AIProvider): T {
  const active = activeProviders(standby);
  const assigned = Object.values(roles);
  const replacement = previousStandby && active.includes(previousStandby)
    ? previousStandby
    : active.find((provider) => !assigned.includes(provider)) ?? active[0];
  return Object.fromEntries(Object.entries(roles).map(([role, provider]) => [
    role, active.includes(provider) ? provider : replacement,
  ])) as unknown as T;
}

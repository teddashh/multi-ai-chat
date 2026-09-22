import type { AIProvider } from '../shared/types';

export const META_HOST_PERMISSION_DENIED_KEY = 'settings.meta_permission_denied';

export interface MetaHostPermissionInput {
  nextStandby: AIProvider;
  /** True when meta.ai access is already granted, or when a request just resolved true. */
  hasPermission: boolean;
  /** True after chrome.permissions.request has resolved. */
  requested?: boolean;
}

export type MetaHostPermissionPlan =
  | { action: 'apply' }
  | { action: 'request' }
  | { action: 'keep'; messageKey: typeof META_HOST_PERMISSION_DENIED_KEY };

/**
 * Choosing a standby other than Meta activates Meta and needs meta.ai access.
 * Choosing Meta puts Meta back on standby and does not prompt.
 */
export function planMetaHostPermission(input: MetaHostPermissionInput): MetaHostPermissionPlan {
  if (input.nextStandby === 'meta' || input.hasPermission) return { action: 'apply' };
  if (input.requested) return { action: 'keep', messageKey: META_HOST_PERMISSION_DENIED_KEY };
  return { action: 'request' };
}

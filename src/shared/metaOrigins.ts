/** Optional meta.ai host patterns. Granted only when the user activates Meta. */
export const META_ORIGINS = ['https://www.meta.ai/*', 'https://meta.ai/*'] as const;

const META_ORIGIN_SET = new Set<string>(META_ORIGINS);

export function includesMetaOrigin(origins: readonly string[] | undefined): boolean {
  return (origins ?? []).some((origin) => META_ORIGIN_SET.has(origin));
}

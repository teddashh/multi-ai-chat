export function firstAcceptedCandidate<T>(
  selectors: readonly string[],
  queryAll: (selector: string) => readonly T[],
  accept: (candidate: T) => boolean,
): T | null {
  for (const selector of selectors) {
    for (const candidate of queryAll(selector)) {
      if (accept(candidate)) return candidate;
    }
  }
  return null;
}

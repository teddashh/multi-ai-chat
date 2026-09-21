// Shared Meta DOM fakes. This file is not named *.test.mts, so `node --test "test/*.test.mts"` does not run it.

export function usableInput() {
  return { closest: () => null };
}

export function inertInput() {
  return { closest: (selectors: string) => selectors.includes('[inert]') ? {} : null };
}

export function composerContainer(kind: 'usable' | 'inert' | 'mixed') {
  const usable = usableInput();
  const inert = inertInput();
  const inputs = kind === 'usable' ? [usable] : kind === 'inert' ? [inert] : [inert, usable];
  return {
    querySelector: () => inputs[0],
    querySelectorAll: () => inputs,
  };
}

export function control(options: {
  disabled?: boolean;
  readOnly?: boolean;
  ancestor?: string;
  visible?: boolean;
  testId?: string | null;
  container?: 'usable' | 'inert' | 'mixed';
} = {}) {
  return {
    ...options,
    getAttribute: (name: string) => name === 'data-testid' ? (options.testId ?? null) : null,
    closest: (selectors: string) => {
      if (options.ancestor && selectors.includes(options.ancestor)) return {};
      if (options.container && selectors.includes('[data-testid*="composer"]')) {
        return composerContainer(options.container);
      }
      return null;
    },
  };
}

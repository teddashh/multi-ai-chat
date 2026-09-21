export interface LoginStatusState {
  reported?: boolean | null;
  missingSince?: number;
}

export interface LoginStatusDecision {
  state: LoginStatusState;
  report?: boolean | null;
  retryInMs?: number;
}

interface LoginStatusSignals {
  ready: boolean | null;
  explicitlyLoggedOut: boolean;
  now: number;
  lossDelayMs: number;
}

/**
 * Treat a mounted composer as an immediate positive signal, but do not turn a short SPA
 * remount into a logout. An explicit login/signup surface remains an immediate negative.
 */
export function decideLoginStatus(
  previous: LoginStatusState,
  signals: LoginStatusSignals,
): LoginStatusDecision {
  if (signals.explicitlyLoggedOut) {
    return {
      state: { reported: false },
      report: previous.reported === false ? undefined : false,
    };
  }

  // Opt-in unknown readiness: a provider with an unrecognized/remounting DOM
  // should report checking rather than inventing a login requirement.
  if (signals.ready === null) {
    return {
      state: { reported: null },
      report: previous.reported === null ? undefined : null,
    };
  }

  if (signals.ready) {
    return {
      state: { reported: true },
      report: previous.reported === true ? undefined : true,
    };
  }

  if (previous.reported === false) return { state: previous };

  const delay = Math.max(0, signals.lossDelayMs);
  const missingSince = previous.missingSince ?? signals.now;
  const remaining = Math.max(0, delay - (signals.now - missingSince));
  if (remaining > 0) {
    return {
      state: { ...previous, missingSince },
      retryInMs: remaining,
    };
  }

  return {
    state: { reported: false },
    report: false,
  };
}

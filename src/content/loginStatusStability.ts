export interface LoginStatusState {
  reported?: boolean;
  missingSince?: number;
}

export interface LoginStatusDecision {
  state: LoginStatusState;
  report?: boolean;
  retryInMs?: number;
}

interface LoginStatusSignals {
  ready: boolean;
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

export interface SemanticResponseBaseline {
  count: number;
  latestText: string;
}

export function isActiveResponseGeneration(
  waitingForResponse: boolean,
  activeGeneration: number,
  candidateGeneration: number,
): boolean {
  return waitingForResponse && activeGeneration === candidateGeneration;
}

export function captureSemanticResponseBaseline<T>(
  responses: readonly T[],
  readText: (response: T) => string | null,
): SemanticResponseBaseline {
  return {
    count: responses.length,
    latestText: latestNonEmptyText(responses, readText) ?? '',
  };
}

const DOCUMENT_POSITION_FOLLOWING = 4;

export function responsesFollowingAnchor<T>(
  responses: readonly T[],
  anchor: { compareDocumentPosition(response: T): number },
): T[] {
  return responses.filter((response) => {
    const position = anchor.compareDocumentPosition(response);
    return !(position & 1) && Boolean(position & DOCUMENT_POSITION_FOLLOWING);
  });
}

export function currentSemanticResponseText<T>(
  responses: readonly T[],
  baseline: SemanticResponseBaseline,
  readText: (response: T) => string | null,
  currentTurnConfirmed = true,
): string | null {
  // A failed request can keep streaming after STOP_GENERATION has reset local state. Its
  // assistant turn may be appended after the Retry baseline, so count growth alone is not
  // proof that a response belongs to Retry. Strong-tracking providers first require the new
  // matching user turn that the site renders for the accepted send.
  if (!currentTurnConfirmed) return null;

  // Never fall through to an older non-empty answer while the newly appended assistant turn
  // is still an empty shell. Only elements beyond the captured turn count belong to it.
  if (responses.length > baseline.count) {
    return latestNonEmptyText(responses.slice(baseline.count), readText);
  }

  // Grok can recycle its last assistant container instead of appending one. Element identity
  // then stays unchanged. currentTurnConfirmed prevents a failed request's late stream from
  // being attributed to Retry before Retry has a matching user turn.
  const latestText = latestNonEmptyText(responses, readText);
  return latestText && latestText !== baseline.latestText ? latestText : null;
}

function latestNonEmptyText<T>(
  responses: readonly T[],
  readText: (response: T) => string | null,
): string | null {
  for (let index = responses.length - 1; index >= 0; index -= 1) {
    const text = readText(responses[index]);
    if (text) return text;
  }
  return null;
}

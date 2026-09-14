export function clearedComposerConfirmsSend(
  activatedInput: unknown,
  currentInput: unknown,
  requireSameComposer: boolean,
  hasNewUserMessage: boolean,
): boolean {
  return hasNewUserMessage
    || !requireSameComposer
    || (activatedInput !== undefined && activatedInput === currentInput);
}

export function contentMatchesPrompt(content: string, prompt: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, '');
  const expected = compact(prompt);
  if (!expected) return false;
  if (compact(content) === expected) return true;
  return visibleMarkdownKey(content) === visibleMarkdownKey(prompt);
}

function visibleMarkdownKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/```[^\r\n]*[\r\n]?/g, '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '');
}

export function matchingPromptCount(messageTexts: readonly string[], prompt: string): number {
  return messageTexts.reduce(
    (count, content) => count + (contentMatchesPrompt(content, prompt) ? 1 : 0),
    0,
  );
}

export function generationSignalBelongsToCurrentTurn(
  signalPresent: boolean,
  requireMatchingUserMessage: boolean,
  hasNewMatchingUserMessage: boolean,
): boolean {
  return signalPresent && (!requireMatchingUserMessage || hasNewMatchingUserMessage);
}

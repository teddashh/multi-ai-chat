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
  return Boolean(expected) && compact(content) === expected;
}

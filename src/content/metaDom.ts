// Seed selectors shared with multi-ai-chat-desktop/adapters/meta.json.
export const META_INPUT_SELECTORS = [
  'input[aria-label="Ask Meta AI"]',
  'textarea[data-ecto-composer-prehydration-input]',
];
export const META_SEND_SELECTORS = ['[data-testid="composer-send-button"]', 'button[aria-label="Send"]'];
export const META_STOP_SELECTORS = ['[data-testid="composer-stop-button"]', 'button[aria-label="Stop"]'];
export const META_RESPONSE_SELECTORS = ['[data-message-item]:not([data-user-message])', '[data-testid="assistant-message"]'];

interface MetaControl {
  disabled?: boolean;
  readOnly?: boolean;
  closest(selector: string): unknown;
}

export function isUsableMetaControl(element: MetaControl): boolean {
  return !element.disabled && !element.readOnly && !element.closest(
    '[inert], [disabled], [readonly], [aria-disabled="true"], [aria-hidden="true"]',
  );
}

export function isVisibleMetaElement(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

export function metaSessionReady(inputs: readonly MetaControl[], isVisible: (element: MetaControl) => boolean): boolean {
  // An enabled guest composer is usable too. A login link alone does not make it unusable.
  return inputs.some((input) => isVisible(input) && isUsableMetaControl(input));
}

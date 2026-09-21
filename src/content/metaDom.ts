// Meta's hydrated textarea and Lexical editor share this test id. The original
// prehydration attribute is conditional and is absent from the rich editor.
export const META_INPUT_SELECTORS = [
  '[data-testid="composer-input"][contenteditable="true"]',
  'textarea[data-testid="composer-input"]',
  'input[data-testid="composer-input"]',
  'input[aria-label="Ask Meta AI"]',
  'textarea[data-ecto-composer-prehydration-input]',
  'textarea[placeholder^="Ask Meta AI" i]',
  'input[placeholder^="Ask Meta AI" i]',
  '[contenteditable="true"][aria-label^="Ask Meta AI" i]',
  '[contenteditable="true"][aria-placeholder^="Ask Meta AI" i]',
];
export const META_SEND_SELECTORS = ['[data-testid="composer-send-button"]', 'button[aria-label="Send"]'];
export const META_STOP_SELECTORS = ['[data-testid="composer-stop-button"]', 'button[aria-label="Stop"]'];
export const META_RESPONSE_SELECTORS = ['[data-message-item]:not([data-user-message])', '[data-testid="assistant-message"]'];

const META_COMPOSER_CONTAINER = '[data-testid*="composer"], [class*="composer"], [class*="input-area"], form, fieldset';

interface MetaControl {
  disabled?: boolean;
  readOnly?: boolean;
  closest(selector: string): unknown;
  getAttribute?(name: string): string | null;
}

interface QueryCapableContainer {
  querySelector(selectors: string): unknown;
  querySelectorAll?(selectors: string): ArrayLike<unknown>;
}

export function isUsableMetaControl(element: MetaControl): boolean {
  return !element.disabled && !element.readOnly && !element.closest(
    '[inert], [disabled], [readonly], [aria-readonly="true"], [aria-disabled="true"], [aria-hidden="true"]',
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

export function metaLoginStatus(
  inputs: readonly MetaControl[],
  isVisible: (element: MetaControl) => boolean,
  hasVisibleLoginButton: boolean,
  hasVisibleLoginWall = false,
): boolean | null {
  if (hasVisibleLoginWall) return false;
  // A guest composer can coexist with the optional header login button.
  if (metaSessionReady(inputs, isVisible)) return true;
  if (hasVisibleLoginButton || inputs.some((input) => isVisible(input) && input.closest('[inert]'))) return false;
  // Missing/remounting/temporarily disabled editors are not evidence of logout.
  return null;
}

export function isMetaLoginLabel(text: string): boolean {
  return /^(?:log in|sign in|登入|登录|ログイン|anmelden|로그인)$/i.test(text.trim());
}

export function isMetaSendControl(element: MetaControl): boolean {
  return isMetaComposerAction(element, 'composer-send-button');
}

export function isMetaStopControl(element: MetaControl): boolean {
  return isMetaComposerAction(element, 'composer-stop-button');
}

export function isMetaGenerationActive(
  stops: readonly MetaControl[],
  isVisible: (element: MetaControl) => boolean,
): boolean {
  return stops.some((element) => isVisible(element) && isMetaStopControl(element));
}

function isMetaComposerAction(element: MetaControl, explicitTestId: string): boolean {
  if (!isUsableMetaControl(element)) return false;
  if (element.getAttribute?.('data-testid') === explicitTestId) return true;
  const container = element.closest(META_COMPOSER_CONTAINER) as QueryCapableContainer | null;
  return Boolean(container && containerHasUsableMetaInput(container));
}

function containerHasUsableMetaInput(container: QueryCapableContainer): boolean {
  const candidates = container.querySelectorAll
    ? Array.from(container.querySelectorAll(META_INPUT_SELECTORS.join(', ')))
    : [container.querySelector(META_INPUT_SELECTORS.join(', '))];
  return candidates.some((candidate) => candidate != null && isUsableMetaControl(candidate as MetaControl));
}

import { createContentScript } from './base';
import { injectMetaInput } from './metaInput';
import {
  META_INPUT_SELECTORS,
  META_RESPONSE_SELECTORS,
  META_SEND_SELECTORS,
  META_STOP_SELECTORS,
  isUsableMetaControl,
  isVisibleMetaElement,
  isMetaLoginLabel,
  metaLoginStatus,
} from './metaDom';

const inputs = () => Array.from(document.querySelectorAll(META_INPUT_SELECTORS.join(', ')));
const loginStatus = () => metaLoginStatus(
  inputs(),
  (input) => isVisibleMetaElement(input as Element),
  Array.from(document.querySelectorAll('[data-testid="login-button"]')).some(isVisibleMetaElement),
  Array.from(document.querySelectorAll('[role="dialog"]')).some((dialog) => (
    isVisibleMetaElement(dialog)
    && Array.from(dialog.querySelectorAll('button, [role="button"], a')).some((control) => (
      isVisibleMetaElement(control)
      && (control.getAttribute('data-testid') === 'login-button'
        || isMetaLoginLabel(control.getAttribute('aria-label') || control.textContent || ''))
    ))
  )),
);

createContentScript({
  provider: 'meta',
  inputSelectors: META_INPUT_SELECTORS,
  requireVisibleInput: true,
  inputFilter: isUsableMetaControl,
  injectInput: injectMetaInput,
  sendButtonSelectors: META_SEND_SELECTORS,
  sendButtonFilter: isUsableMetaControl,
  responseSelectors: META_RESPONSE_SELECTORS,
  stopButtonSelectors: META_STOP_SELECTORS,
  stopButtonFilter: isUsableMetaControl,
  loginDetector: loginStatus,
  loggedOutDetector: () => loginStatus() === false,
  loginLossDelay: 2500,
  isThinking: () => Array.from(document.querySelectorAll(META_STOP_SELECTORS.join(', ')))
    .some((element) => isVisibleMetaElement(element) && isUsableMetaControl(element)),
  streamWhileThinking: true,
  doneDelay: 5000,
  chunkDebounce: 600,
});

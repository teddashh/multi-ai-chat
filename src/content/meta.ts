import { createContentScript } from './base';
import {
  META_INPUT_SELECTORS,
  META_RESPONSE_SELECTORS,
  META_SEND_SELECTORS,
  META_STOP_SELECTORS,
  isUsableMetaControl,
  isVisibleMetaElement,
  metaSessionReady,
} from './metaDom';

const inputs = () => Array.from(document.querySelectorAll(META_INPUT_SELECTORS.join(', ')));
const ready = () => metaSessionReady(inputs(), (input) => isVisibleMetaElement(input as Element));

createContentScript({
  provider: 'meta',
  inputSelectors: META_INPUT_SELECTORS,
  requireVisibleInput: true,
  inputFilter: isUsableMetaControl,
  sendButtonSelectors: META_SEND_SELECTORS,
  sendButtonFilter: isUsableMetaControl,
  responseSelectors: META_RESPONSE_SELECTORS,
  stopButtonSelectors: META_STOP_SELECTORS,
  stopButtonFilter: isUsableMetaControl,
  loginDetector: ready,
  loggedOutDetector: () => !ready() && (
    inputs().some((input) => isVisibleMetaElement(input) && !isUsableMetaControl(input))
    || Array.from(document.querySelectorAll('[data-testid="login-button"]')).some(isVisibleMetaElement)
  ),
  loginLossDelay: 2500,
  isThinking: () => Array.from(document.querySelectorAll(META_STOP_SELECTORS.join(', ')))
    .some((element) => isVisibleMetaElement(element) && isUsableMetaControl(element)),
  doneDelay: 5000,
  chunkDebounce: 600,
});

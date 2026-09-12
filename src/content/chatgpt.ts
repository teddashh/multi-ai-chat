import { createContentScript } from './base';
import {
  CHATGPT_INPUT_SELECTORS,
  CHATGPT_LOGGED_OUT_SELECTORS,
  CHATGPT_STOP_SELECTORS,
  CHATGPT_USER_MESSAGE_SELECTORS,
  isChatGptComposerInput,
  isChatGptSendControl,
  isChatGptStopControl,
  isIncompleteChatGptAssistantTurn,
} from './chatgptDom';

function hasVisibleElement(
  selectors: readonly string[],
  filter: (element: Element) => boolean = () => true,
): boolean {
  return selectors.some((selector) => Array.from(document.querySelectorAll(selector)).some((element) => {
    if (filter(element) === false) return false;
    if (!(element instanceof HTMLElement)) return true;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }));
}

createContentScript({
  provider: 'chatgpt',

  // ChatGPT's prompt input (contenteditable div in 2026)
  inputSelectors: CHATGPT_INPUT_SELECTORS,
  requireVisibleInput: true,
  inputFilter: isChatGptComposerInput,

  sendButtonSelectors: [
    '[data-testid="send-button"]',
    '#composer-submit-button',
    'button[data-testid*="composer-send"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send"]',
  ],
  sendButtonFilter: isChatGptSendControl,
  userMessageSelectors: CHATGPT_USER_MESSAGE_SELECTORS,
  requireSameComposerForClearConfirmation: true,

  // Response container — ChatGPT uses multiple assistant messages
  // (thinking messages + final response all share the same structure)
  responseSelectors: [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"]',
  ],

  stopButtonSelectors: CHATGPT_STOP_SELECTORS,
  stopButtonFilter: isChatGptStopControl,

  loginDetector: () => hasVisibleElement(CHATGPT_INPUT_SELECTORS, isChatGptComposerInput),

  // The signed-out ChatGPT home page can also expose a composer. Prefer explicit account
  // controls, and do not treat the composer's short SPA remount as a logout.
  loggedOutDetector: () => hasVisibleElement(CHATGPT_LOGGED_OUT_SELECTORS),
  loginLossDelay: 2500,

  // Detect if ChatGPT is still generating/thinking/searching
  // Key insight: when ChatGPT is still working, a "stop" button is visible
  isThinking: () => {
    // Check for stop/cancel button — if it exists, ChatGPT is still working
    if (hasVisibleElement(CHATGPT_STOP_SELECTORS, isChatGptStopControl)) return true;
    // The stop button is only mounted while tokens are actively arriving: it is removed before
    // the last render commits, and it can vanish entirely between the phases of a multi-step
    // answer (search, reasoning). On its own it lets a pause longer than doneDelay read as
    // "finished". A turn only grows a copy button once its message is complete (no hover
    // needed), so use that to cover the gaps the stop button leaves.
    // Note: this pins us to ChatGPT's copy-turn-action-button testid. If it is renamed we wait
    // until the background 600s timeout and surface an error — loud beats silently shipping
    // half an answer into the next provider's prompt.
    const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    const lastTurn = turns[turns.length - 1];
    return Boolean(lastTurn && isIncompleteChatGptAssistantTurn(lastTurn));
  },

  // ChatGPT needs longer done delay because of multi-step thinking
  doneDelay: 3000,
  chunkDebounce: 800,
});

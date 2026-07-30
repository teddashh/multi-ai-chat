import { createContentScript } from './base';

createContentScript({
  provider: 'chatgpt',

  // ChatGPT's prompt input (contenteditable div in 2026)
  inputSelectors: [
    '#prompt-textarea',
    '[id="prompt-textarea"]',
    'div[contenteditable="true"][data-placeholder]',
  ],

  sendButtonSelectors: [
    '[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send"]',
  ],

  // Response container — ChatGPT uses multiple assistant messages
  // (thinking messages + final response all share the same structure)
  responseSelectors: [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"]',
  ],

  stopButtonSelectors: [
    '[data-testid="stop-button"]',
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop streaming"]',
    'button[aria-label="Stop"]',
  ],

  loginDetector: () => {
    return !!(
      document.querySelector('#prompt-textarea') ||
      document.querySelector('[data-testid="send-button"]')
    );
  },

  // Detect if ChatGPT is still generating/thinking/searching
  // Key insight: when ChatGPT is still working, a "stop" button is visible
  isThinking: () => {
    // Check for stop/cancel button — if it exists, ChatGPT is still working
    const stopBtn = document.querySelector(
      '[data-testid="stop-button"], ' +
      'button[aria-label="Stop generating"], ' +
      'button[aria-label="Stop streaming"], ' +
      'button[aria-label="Stop"]'
    );
    if (stopBtn) return true;
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
    return !!lastTurn && !lastTurn.querySelector('[data-testid="copy-turn-action-button"]');
  },

  // ChatGPT needs longer done delay because of multi-step thinking
  doneDelay: 3000,
  chunkDebounce: 800,
});

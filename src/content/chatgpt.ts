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
    return !!stopBtn;
  },

  // ChatGPT needs longer done delay because of multi-step thinking
  doneDelay: 3000,
  chunkDebounce: 800,
});

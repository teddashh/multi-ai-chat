import type { AIProvider, ExtensionMessage } from '../shared/types';

export interface ContentScriptConfig {
  provider: AIProvider;
  // Multiple selectors to try (first match wins)
  inputSelectors: string[];
  sendButtonSelectors: string[];
  responseSelectors: string[];
  loginDetector: () => boolean;
  // Optional: detect if AI is still "thinking" (not yet generating response)
  isThinking?: () => boolean;
  // Optional: custom input method
  injectInput?: (el: Element, text: string) => void;
  // How long after last DOM change to consider response "done" (ms)
  doneDelay?: number;
  // Minimum interval between RESPONSE_CHUNK messages (ms)
  chunkDebounce?: number;
}

function queryFirst(selectors: string[]): Element | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function createContentScript(config: ContentScriptConfig) {
  const {
    provider,
    inputSelectors,
    sendButtonSelectors,
    responseSelectors,
    loginDetector,
    isThinking,
    injectInput,
    doneDelay = 3000,
    chunkDebounce = 500,
  } = config;

  console.log(`[Multi-AI Chat] ${provider} content script loaded`);

  // Guard: check if extension context is still valid before any chrome.runtime call
  function isContextValid(): boolean {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function safeSendMessage(msg: object) {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    chrome.runtime.sendMessage(msg).catch(() => {});
  }

  // Cleanup when extension context is invalidated (extension reloaded)
  let statusInterval: ReturnType<typeof setInterval> | null = null;

  function clearAllTimers() {
    if (responseTimeout) { clearTimeout(responseTimeout); responseTimeout = null; }
    if (checkDoneInterval) { clearInterval(checkDoneInterval); checkDoneInterval = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
  }

  function cleanup() {
    clearAllTimers();
    console.log(`[Multi-AI Chat] ${provider}: context invalidated, stopped polling`);
  }

  // Report status to background
  function reportStatus() {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    const isLoggedIn = loginDetector();
    safeSendMessage({
      action: 'STATUS_REPORT',
      provider,
      payload: { loggedIn: isLoggedIn },
    });
  }

  reportStatus();
  statusInterval = setInterval(reportStatus, 10000);

  // Track the last response element before sending, so we can detect the NEW response
  let lastSeenResponseEl: Element | null = null;
  let waitingForResponse = false;

  // Send message by injecting text into the input field
  function sendMessage(text: string) {
    const input = queryFirst(inputSelectors);
    if (!input) {
      console.error(`[Multi-AI Chat] ${provider}: input not found. Tried:`, inputSelectors);
      // Report error as RESPONSE_DONE so the chain doesn't hang
      safeSendMessage({
        action: 'RESPONSE_DONE',
        provider,
        payload: `[Error: ${provider} input element not found]`,
      });
      return;
    }

    // Snapshot current last response element BEFORE sending
    const existingResponses = document.querySelectorAll(responseSelectors.join(', '));
    lastSeenResponseEl = existingResponses.length > 0 ? existingResponses[existingResponses.length - 1] : null;
    waitingForResponse = true;
    lastResponseText = '';
    startResponsePolling();

    console.log(`[Multi-AI Chat] ${provider}: injecting message, last seen response el:`, lastSeenResponseEl);

    // Inject text
    if (injectInput) {
      injectInput(input, text);
    } else {
      defaultInjectInput(input, text);
    }

    // Click send button after short delay (longer for rich editors to register the input)
    setTimeout(() => {
      const sendBtn = queryFirst(sendButtonSelectors);
      if (sendBtn) {
        console.log(`[Multi-AI Chat] ${provider}: clicking send button`);
        (sendBtn as HTMLElement).click();
      } else {
        console.log(`[Multi-AI Chat] ${provider}: no send button found, trying Enter key`);
        const target = document.activeElement || input as HTMLElement;
        // Try keydown + keypress + keyup sequence (some frameworks need all three)
        const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
        target.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
        target.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
        target.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
      }

      // Retry only if input still has text (empty input = send already succeeded)
      setTimeout(() => {
        if (!waitingForResponse) return;
        const currentResponses = document.querySelectorAll(responseSelectors.join(', '));
        const currentLastEl = currentResponses.length > 0 ? currentResponses[currentResponses.length - 1] : null;
        if (currentLastEl && currentLastEl !== lastSeenResponseEl) return; // new response appeared

        // If input was cleared, send worked — just waiting for response DOM
        const currentInput = queryFirst(inputSelectors);
        const inputText = currentInput?.textContent?.trim() ?? '';
        if (!inputText) {
          console.log(`[Multi-AI Chat] ${provider}: input cleared, send succeeded, skipping retry`);
          return;
        }

        const retryBtn = queryFirst(sendButtonSelectors);
        if (retryBtn) {
          console.log(`[Multi-AI Chat] ${provider}: retry - clicking send button`);
          (retryBtn as HTMLElement).click();
        } else {
          console.log(`[Multi-AI Chat] ${provider}: retry - Enter key`);
          const retryTarget = currentInput || document.activeElement;
          if (retryTarget) {
            (retryTarget as HTMLElement).focus();
            const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
            retryTarget.dispatchEvent(new KeyboardEvent('keydown', opts));
            retryTarget.dispatchEvent(new KeyboardEvent('keypress', opts));
            retryTarget.dispatchEvent(new KeyboardEvent('keyup', opts));
          }
        }
      }, 1500);
    }, 800);
  }

  function defaultInjectInput(input: Element, text: string) {
    const el = input as HTMLElement;
    el.focus();

    if (input instanceof HTMLTextAreaElement) {
      // Native textarea value setter (React-compatible)
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      setter?.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // contenteditable div — clear then insert via execCommand
      el.focus();

      // Clear existing content
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel?.removeAllRanges();
      sel?.addRange(range);

      // Insert text (triggers React/framework change detection)
      document.execCommand('insertText', false, text);

      // Fire input event
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // === Response observation ===
  let lastResponseText = '';
  let responseTimeout: ReturnType<typeof setTimeout> | null = null;
  let lastChunkTime = 0;

  function getLatestResponseText(): string | null {
    // Try all response selectors
    const selector = responseSelectors.join(', ');
    const responseEls = document.querySelectorAll(selector);
    if (responseEls.length === 0) return null;

    // Find the last element in DOM order
    const lastEl = responseEls[responseEls.length - 1];

    // If we're waiting and the last element is the same as before sending, no new response yet
    if (waitingForResponse && lastSeenResponseEl && lastEl === lastSeenResponseEl) {
      return null;
    }

    const text = lastEl.textContent?.trim() ?? '';
    return text || null;
  }

  // Check if response is truly done (not still thinking)
  // If still thinking, poll every second until done
  let checkDoneInterval: ReturnType<typeof setInterval> | null = null;

  function checkIfDone() {
    if (!waitingForResponse) return;

    // If still thinking, keep polling
    if (isThinking?.()) {
      if (!checkDoneInterval) {
        console.log(`[Multi-AI Chat] ${provider}: DOM stable but still thinking, polling...`);
        checkDoneInterval = setInterval(() => {
          if (!waitingForResponse) {
            if (checkDoneInterval) { clearInterval(checkDoneInterval); checkDoneInterval = null; }
            return;
          }
          if (!isThinking?.()) {
            // Stopped thinking — grab the final text and wait one more doneDelay
            if (checkDoneInterval) { clearInterval(checkDoneInterval); checkDoneInterval = null; }
            console.log(`[Multi-AI Chat] ${provider}: thinking done, waiting for final text...`);
            // Wait for final text to settle
            setTimeout(() => {
              const finalText = getLatestResponseText();
              if (finalText) lastResponseText = finalText;
              finishResponse();
            }, doneDelay);
          }
        }, 1000);
      }
      return;
    }

    finishResponse();
  }

  function finishResponse() {
    if (!waitingForResponse) return;
    waitingForResponse = false;
    if (responseTimeout) { clearTimeout(responseTimeout); responseTimeout = null; }
    if (checkDoneInterval) { clearInterval(checkDoneInterval); checkDoneInterval = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    console.log(`[Multi-AI Chat] ${provider}: response done (${lastResponseText.length} chars)`);
    safeSendMessage({
      action: 'RESPONSE_DONE',
      provider,
      payload: lastResponseText,
    });
  }

  function observeResponses() {
    const observer = new MutationObserver(() => {
      if (!waitingForResponse) return;

      // Skip if AI is in "thinking" state (e.g., ChatGPT searching)
      if (isThinking?.()) return;

      const currentText = getLatestResponseText();
      if (!currentText || currentText === lastResponseText) return;

      lastResponseText = currentText;

      // Debounce RESPONSE_CHUNK — don't spam the side panel
      const now = Date.now();
      if (now - lastChunkTime >= chunkDebounce) {
        lastChunkTime = now;
        safeSendMessage({
          action: 'RESPONSE_CHUNK',
          provider,
          payload: currentText,
        });
      }

      // Reset "done" timer — response is done when DOM stops changing AND not thinking
      if (responseTimeout) clearTimeout(responseTimeout);
      responseTimeout = setTimeout(() => {
        checkIfDone();
      }, doneDelay);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  observeResponses();

  // Backup polling: if MutationObserver misses response changes, poll every 3s
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  function startResponsePolling() {
    if (pollInterval) return;
    pollInterval = setInterval(() => {
      if (!waitingForResponse) {
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
        return;
      }
      const currentText = getLatestResponseText();
      if (!currentText || currentText === lastResponseText) return;

      console.log(`[Multi-AI Chat] ${provider}: poll detected response change (${currentText.length} chars)`);
      lastResponseText = currentText;

      safeSendMessage({
        action: 'RESPONSE_CHUNK',
        provider,
        payload: currentText,
      });

      // Reset done timer
      if (responseTimeout) clearTimeout(responseTimeout);
      responseTimeout = setTimeout(() => {
        checkIfDone();
      }, doneDelay);
    }, 3000);
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.action === 'SEND_MESSAGE' && message.provider === provider) {
      const { text } = message.payload as { text: string };
      sendMessage(text);
    }
    if (message.action === 'CHECK_STATUS') {
      reportStatus();
    }
  });
}

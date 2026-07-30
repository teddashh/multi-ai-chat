import type { AIProvider, ExtensionMessage } from '../shared/types';
import { longerResponseText, serializeResponseText } from './responseSerializer';

export interface ContentScriptConfig {
  provider: AIProvider;
  inputSelectors: string[];
  sendButtonSelectors: string[];
  responseSelectors: string[];
  stopButtonSelectors?: string[];
  loginDetector: () => boolean;
  isThinking?: () => boolean;
  injectInput?: (element: Element, text: string) => void | Promise<void>;
  doneDelay?: number;
  chunkDebounce?: number;
}

interface SendActivationResult {
  ok: boolean;
  path: 'button-click' | 'enter-key';
  detail?: string;
}

const INPUT_RETRY_MS = 250;
const INPUT_TIMEOUT_MS = 2500;
const SEND_BUTTON_TIMEOUT_MS = 800;
const PRE_SEND_DELAY_MS = 800;
const SEND_RETRY_DELAY_MS = 1500;
const SEND_VERIFY_DELAY_MS = 1500;

export function createContentScript(config: ContentScriptConfig): void {
  const marker = `__multiAiChat_${config.provider}`;
  const scope = window as unknown as Record<string, unknown>;
  const existing = scope[marker] as { dispose?: () => void } | undefined;
  try {
    existing?.dispose?.();
  } catch {
    delete scope[marker];
  }
  const runtimeState: { dispose?: () => void } = {};
  scope[marker] = runtimeState;

  const {
    provider,
    inputSelectors,
    responseSelectors,
    loginDetector,
    isThinking = () => false,
    injectInput = defaultInjectInput,
    doneDelay = 3000,
    chunkDebounce = 500,
  } = config;

  let statusInterval: ReturnType<typeof setInterval> | undefined;
  let responseTimeout: ReturnType<typeof setTimeout> | undefined;
  let checkDoneInterval: ReturnType<typeof setInterval> | undefined;
  let pollInterval: ReturnType<typeof setInterval> | undefined;
  let responseBaselineEls = new Set<Element>();
  let waitingForResponse = false;
  let lastResponseText = '';
  let lastChunkTime = 0;
  let activeRequestId: string | undefined;
  let activeWorkflowId: string | undefined;
  let responseObserver: MutationObserver | undefined;
  let sawGenerationActivity = false;
  const sendTimeouts = new Set<number>();

  function isContextValid(): boolean {
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  function safeSendMessage(message: ExtensionMessage): void {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  function cleanup(): void {
    clearResponseTimers();
    if (statusInterval !== undefined) clearInterval(statusInterval);
    statusInterval = undefined;
    responseObserver?.disconnect();
    responseObserver = undefined;
    try {
      chrome.runtime.onMessage.removeListener(runtimeListener);
    } catch {}
    if (scope[marker] === runtimeState) delete scope[marker];
  }

  function reportStatus(): void {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    safeSendMessage({ action: 'STATUS_REPORT', provider, payload: { loggedIn: loginDetector() } });
  }

  async function sendMessage(text: string, requestId?: string, workflowId?: string): Promise<void> {
    if (!text.trim()) throw new Error('Message is empty');
    if (waitingForResponse) throw new Error(`${provider} already has a response in progress`);

    const input = await retryLookup(() => queryFirst(inputSelectors), INPUT_TIMEOUT_MS);
    if (!input) {
      finishWithError(`${provider} input element not found`, requestId, workflowId);
      throw new Error(`${provider} input element not found`);
    }

    const existingResponses = Array.from(document.querySelectorAll(responseSelectors.join(', ')));
    responseBaselineEls = new Set(existingResponses);
    waitingForResponse = true;
    activeRequestId = requestId;
    activeWorkflowId = workflowId;
    lastResponseText = '';
    sawGenerationActivity = false;
    startResponsePolling();

    const injectionStartedAt = Date.now();
    try {
      await injectInput(input, text);
      await Promise.resolve();
      assertInputLanded(input, text);
    } catch (error) {
      finishWithError(`${provider} input injection failed: ${errorMessage(error)}`, requestId, workflowId);
      throw error;
    }

    const delay = Math.max(0, PRE_SEND_DELAY_MS - (Date.now() - injectionStartedAt));
    scheduleForRequest(() => {
      void (async () => {
        const firstAttempt = await activateSend(input, requestId);
        scheduleForRequest(() => void retrySendIfStillPending(input, firstAttempt, requestId), SEND_RETRY_DELAY_MS, requestId);
      })();
    }, delay, requestId);
  }

  async function retrySendIfStillPending(originalInput: Element, firstAttempt: SendActivationResult, requestId?: string): Promise<void> {
    if (!isActiveRequest(requestId) || sendStarted()) return;
    const currentInput = queryFirst(inputSelectors);
    if (!currentInput) {
      if (!firstAttempt.ok) finishWithError(`${provider} input disappeared before send was confirmed`);
      return;
    }
    if (!getInputText(currentInput).trim()) return;

    if (firstAttempt.ok && firstAttempt.path === 'button-click') {
      const firstButton = querySendButton(currentInput);
      if (!firstButton || isDisabled(firstButton)) return;
    }

    const retryAttempt = await activateSend(currentInput ?? originalInput, requestId);
    if (!isActiveRequest(requestId)) return;
    if (!retryAttempt.ok) {
      finishWithError(`${provider} send activation failed: ${retryAttempt.detail ?? firstAttempt.detail ?? retryAttempt.path}`);
      return;
    }
    scheduleForRequest(() => verifySendAfterRetry(retryAttempt, requestId), SEND_VERIFY_DELAY_MS, requestId);
  }

  function verifySendAfterRetry(retryAttempt: SendActivationResult, requestId?: string): void {
    if (!isActiveRequest(requestId) || sendStarted()) return;
    const currentInput = queryFirst(inputSelectors);
    if (!currentInput) return;
    const sendButton = querySendButton(currentInput);
    if (retryAttempt.path === 'button-click' && (!sendButton || isDisabled(sendButton))) return;
    const hadSendButton = Boolean(sendButton);
    const enterOk = dispatchEnter(currentInput);
    if (!enterOk) {
      finishWithError(`${provider} send activation failed: Enter dispatch failed`);
      return;
    }
    scheduleForRequest(() => {
      if (!isActiveRequest(requestId) || sendStarted()) return;
      const finalInput = queryFirst(inputSelectors);
      const finalButton = finalInput ? querySendButton(finalInput) : null;
      if (!finalInput || !getInputText(finalInput).trim()) return;
      if (hadSendButton && (!finalButton || isDisabled(finalButton))) return;
      finishWithError(`${provider} send was not accepted; the draft is still in the composer`);
    }, SEND_VERIFY_DELAY_MS, requestId);
  }

  async function activateSend(input: Element, requestId?: string): Promise<SendActivationResult> {
    const sendButton = await retryLookup(() => querySendButton(input), SEND_BUTTON_TIMEOUT_MS);
    if (!isActiveRequest(requestId)) return { ok: false, path: 'enter-key', detail: 'request cancelled' };
    if (sendButton && !isDisabled(sendButton) && clickElement(sendButton)) return { ok: true, path: 'button-click' };
    const ok = dispatchEnter(input);
    return { ok, path: 'enter-key', detail: ok ? undefined : 'Enter dispatch failed' };
  }

  function querySendButton(input: Element): Element | null {
    const container = input.closest?.('form, fieldset, [data-testid*="composer"], [class*="composer"], [class*="input-area"]');
    if (container) {
      const local = queryFirst(config.sendButtonSelectors, container, true);
      if (local) return local;
    }
    return queryFirst(config.sendButtonSelectors, document, true);
  }

  function sendStarted(): boolean {
    if (!waitingForResponse) return true;
    if (isThinking()) {
      sawGenerationActivity = true;
      return true;
    }
    const responses = Array.from(document.querySelectorAll(responseSelectors.join(', ')));
    if (responses.some((element) => !responseBaselineEls.has(element))) {
      sawGenerationActivity = true;
      return true;
    }
    const input = queryFirst(inputSelectors);
    const cleared = Boolean(input && !getInputText(input).trim());
    if (cleared) sawGenerationActivity = true;
    return cleared;
  }

  function getLatestResponseText(): string | null {
    const responses = Array.from(document.querySelectorAll(responseSelectors.join(', ')));
    for (let index = responses.length - 1; index >= 0; index -= 1) {
      const response = responses[index];
      if (waitingForResponse && responseBaselineEls.has(response)) continue;
      const text = extractResponseText(response);
      if (text) return text;
    }
    return null;
  }

  function extractResponseText(response: Element): string | null {
    const text = serializeResponseText(response);
    if (text) return text;
    const responseTag = typeof response.tagName === 'string' ? response.tagName.toUpperCase() : '';
    const asset = ['IMG', 'CANVAS', 'VIDEO'].includes(responseTag)
      ? response
      : response.querySelector?.('img, canvas, video') ?? null;
    if (!asset) return null;
    const alt = asset instanceof HTMLImageElement ? asset.alt.trim() : '';
    return alt ? `[Image generated: ${alt}]` : '[Image generated]';
  }

  function observeResponses(): void {
    responseObserver = new MutationObserver(() => {
      if (!waitingForResponse || isThinking()) return;
      updateResponse();
    });
    responseObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function updateResponse(): void {
    const currentText = getLatestResponseText();
    if (!currentText || currentText === lastResponseText) return;
    sawGenerationActivity = true;
    lastResponseText = currentText;
    const now = Date.now();
    if (now - lastChunkTime >= chunkDebounce) {
      lastChunkTime = now;
      safeSendMessage({
        action: 'RESPONSE_CHUNK',
        provider,
        requestId: activeRequestId,
        workflowId: activeWorkflowId,
        payload: currentText,
      });
    }
    if (responseTimeout !== undefined) clearTimeout(responseTimeout);
    responseTimeout = setTimeout(checkIfDone, doneDelay);
  }

  function startResponsePolling(): void {
    if (pollInterval !== undefined) return;
    pollInterval = setInterval(() => {
      if (!waitingForResponse) {
        if (pollInterval !== undefined) clearInterval(pollInterval);
        pollInterval = undefined;
        return;
      }
      if (isThinking()) {
        sawGenerationActivity = true;
        return;
      }
      const currentText = getLatestResponseText();
      if (currentText) {
        updateResponse();
        return;
      }
      if (sawGenerationActivity && responseTimeout === undefined) {
        responseTimeout = setTimeout(() => {
          const finalText = getLatestResponseText();
          lastResponseText = finalText || '[No text response detected]';
          finishResponse();
        }, doneDelay);
      }
    }, 3000);
  }

  function checkIfDone(): void {
    if (!waitingForResponse) return;
    if (isThinking()) {
      if (checkDoneInterval === undefined) {
        checkDoneInterval = setInterval(() => {
          if (!waitingForResponse) return clearDoneCheck();
          if (!isThinking()) {
            clearDoneCheck();
            responseTimeout = setTimeout(finishResponse, doneDelay);
          }
        }, 1000);
      }
      return;
    }
    finishResponse();
  }

  function finishResponse(): void {
    if (!waitingForResponse) return;
    // Must re-read before resetResponseState(): the baseline filter keys off waitingForResponse.
    const text = longerResponseText(lastResponseText, getLatestResponseText());
    const requestId = activeRequestId;
    const workflowId = activeWorkflowId;
    resetResponseState();
    safeSendMessage({ action: 'RESPONSE_DONE', provider, requestId, workflowId, payload: text });
  }

  function finishWithError(reason: string, requestId = activeRequestId, workflowId = activeWorkflowId): void {
    resetResponseState();
    safeSendMessage({ action: 'RESPONSE_DONE', provider, requestId, workflowId, payload: `[Error: ${reason}]` });
  }

  function stopGeneration(): void {
    const stopButton = queryFirst(config.stopButtonSelectors ?? [], document, true);
    if (stopButton) clickElement(stopButton);
    resetResponseState();
  }

  function resetResponseState(): void {
    waitingForResponse = false;
    clearResponseTimers();
    responseBaselineEls.clear();
    activeRequestId = undefined;
    activeWorkflowId = undefined;
    sawGenerationActivity = false;
  }

  function isActiveRequest(requestId?: string): boolean {
    return waitingForResponse && activeRequestId === requestId;
  }

  function scheduleForRequest(callback: () => void, delay: number, requestId = activeRequestId): void {
    const timer = window.setTimeout(() => {
      sendTimeouts.delete(timer);
      if (isActiveRequest(requestId)) callback();
    }, delay);
    sendTimeouts.add(timer);
  }

  function clearDoneCheck(): void {
    if (checkDoneInterval !== undefined) clearInterval(checkDoneInterval);
    checkDoneInterval = undefined;
  }

  function clearResponseTimers(): void {
    if (responseTimeout !== undefined) clearTimeout(responseTimeout);
    if (pollInterval !== undefined) clearInterval(pollInterval);
    clearDoneCheck();
    responseTimeout = undefined;
    pollInterval = undefined;
    for (const timer of sendTimeouts) window.clearTimeout(timer);
    sendTimeouts.clear();
  }

  const runtimeListener = (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
    if (message.action === 'SEND_MESSAGE' && message.provider === provider) {
      const { text = '' } = (message.payload as { text?: string } | undefined) ?? {};
      void sendMessage(text, message.requestId, message.workflowId)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
      return true;
    }
    if (message.action === 'CHECK_STATUS') {
      reportStatus();
      sendResponse({ ok: true });
      return true;
    }
    if (message.action === 'STOP_GENERATION' && (!message.provider || message.provider === provider)) {
      stopGeneration();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  };

  runtimeState.dispose = cleanup;
  chrome.runtime.onMessage.addListener(runtimeListener);

  reportStatus();
  statusInterval = setInterval(reportStatus, 10_000);
  observeResponses();
}

async function retryLookup<T>(lookup: () => T | null | undefined, timeoutMs: number): Promise<T | null> {
  const startedAt = Date.now();
  while (true) {
    const value = lookup();
    if (value) return value;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, Math.min(INPUT_RETRY_MS, timeoutMs - elapsed)));
  }
}

function queryFirst(selectors: string[], root: ParentNode = document, requireVisible = false): Element | null {
  for (const selector of selectors) {
    const candidates = root.querySelectorAll(selector);
    for (const candidate of candidates) {
      if (!requireVisible || isVisible(candidate)) return candidate;
    }
  }
  return null;
}

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

function getInputText(input: Element): string {
  return input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement ? input.value : input.textContent ?? '';
}

function assertInputLanded(input: Element, expected: string): void {
  const actual = getInputText(input);
  if (!actual.trim()) throw new Error('editor remained empty');
  if (!composerTextMatches(input, expected)) throw new Error('editor text did not match the requested prompt');
}

function composerTextMatches(input: Element, expected: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, '');
  return compact(getInputText(input)) === compact(expected);
}

function defaultInjectInput(input: Element, text: string): void {
  const element = input as HTMLElement;
  element.focus();
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const prototype = input instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return;
  }

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const inserted = typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  if (inserted && composerTextMatches(input, text)) return;

  element.replaceChildren();
  for (const line of text.split('\n')) {
    const paragraph = document.createElement('p');
    paragraph.textContent = line || '\u00A0';
    element.appendChild(paragraph);
  }
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
}

function clickElement(element: Element): boolean {
  if (isDisabled(element)) return false;
  const target = element as HTMLElement;
  try {
    target.focus();
    target.click();
    return true;
  } catch {
    return false;
  }
}

function isDisabled(element: Element): boolean {
  const target = element as HTMLElement & { disabled?: boolean };
  return Boolean(target.disabled || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true' || target.getAttribute('data-disabled') === 'true');
}

function dispatchEnter(input: Element): boolean {
  (input as HTMLElement).focus?.();
  const target = document.activeElement ?? input;
  const options = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
  try {
    target.dispatchEvent(new KeyboardEvent('keydown', options));
    target.dispatchEvent(new KeyboardEvent('keypress', options));
    target.dispatchEvent(new KeyboardEvent('keyup', options));
    return true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

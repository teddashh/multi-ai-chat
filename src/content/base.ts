import type { AIProvider, ExtensionMessage } from '../shared/types';
import { encodeError } from '../shared/errors';
import { longerResponseText, serializeResponseText } from './responseSerializer';
import { isActiveContentRequest, shouldStopActiveRequest } from '../shared/requestScope';
import { decideLoginStatus, type LoginStatusState } from './loginStatusStability';
import { focusWithoutScroll } from './focusWithoutScroll';
import { firstAcceptedCandidate } from './elementSelection';
import { clearedComposerConfirmsSend, contentMatchesPrompt } from './sendConfirmation';

export interface ContentScriptConfig {
  provider: AIProvider;
  inputSelectors: string[];
  requireVisibleInput?: boolean;
  inputFilter?: (element: Element) => boolean;
  sendButtonSelectors: string[];
  sendButtonFilter?: (element: Element) => boolean;
  userMessageSelectors?: string[];
  requireSameComposerForClearConfirmation?: boolean;
  responseSelectors: string[];
  stopButtonSelectors?: string[];
  stopButtonFilter?: (element: Element) => boolean;
  loginDetector: () => boolean;
  loggedOutDetector?: () => boolean;
  loginLossDelay?: number;
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
const SEND_CONFIRMATION_GRACE_MS = 2000;
const SEND_VERIFY_DELAY_MS = 1500;
// 送出成功但完全抓不到回應時，至少等這麼久才放棄。慢的模型（深度思考、搜尋）
// 常常好幾十秒才吐出第一個字，而 isThinking() 只靠硬寫的選擇器，漏判是常態。
// notes: 固定 2 分鐘，遠短於背景的 600 秒逾時；若真出現更慢的模型再拉長
const NO_RESPONSE_GRACE_MS = 120_000;

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
    requireVisibleInput = false,
    inputFilter = () => true,
    responseSelectors,
    loginDetector,
    loggedOutDetector = () => false,
    loginLossDelay = 0,
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
  let userMessageBaselineEls = new Set<Element>();
  let waitingForResponse = false;
  let lastResponseText = '';
  let lastChunkTime = 0;
  let activeRequestId: string | undefined;
  let activeWorkflowId: string | undefined;
  let responseObserver: MutationObserver | undefined;
  let sawGenerationActivity = false;
  let loginStatusState: LoginStatusState = {};
  let loginStatusTimeout: ReturnType<typeof setTimeout> | undefined;
  let responseWaitStartedAt = 0;
  let activePromptText = '';
  let lastActivatedInput: Element | undefined;
  let disposed = false;
  const sendTimeouts = new Set<number>();

  const queryInput = (): Element | null => queryFirst(
    inputSelectors,
    document,
    requireVisibleInput,
    inputFilter,
  );

  function isContextValid(): boolean {
    if (disposed || scope[marker] !== runtimeState) return false;
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
    if (disposed) return;
    disposed = true;
    waitingForResponse = false;
    activeRequestId = undefined;
    activeWorkflowId = undefined;
    activePromptText = '';
    lastActivatedInput = undefined;
    clearResponseTimers();
    if (statusInterval !== undefined) clearInterval(statusInterval);
    statusInterval = undefined;
    if (loginStatusTimeout !== undefined) clearTimeout(loginStatusTimeout);
    loginStatusTimeout = undefined;
    responseObserver?.disconnect();
    responseObserver = undefined;
    try {
      chrome.runtime.onMessage.removeListener(runtimeListener);
    } catch {}
    if (scope[marker] === runtimeState) delete scope[marker];
  }

  function reportStatus(force = false): void {
    if (!isContextValid()) {
      cleanup();
      return;
    }
    const decision = decideLoginStatus(loginStatusState, {
      ready: loginDetector(),
      explicitlyLoggedOut: loggedOutDetector(),
      now: Date.now(),
      lossDelayMs: loginLossDelay,
    });
    loginStatusState = decision.state;

    if (loginStatusTimeout !== undefined) clearTimeout(loginStatusTimeout);
    loginStatusTimeout = undefined;
    if (decision.retryInMs !== undefined) {
      loginStatusTimeout = setTimeout(reportStatus, decision.retryInMs);
    }
    const statusToReport = decision.report ?? (force ? decision.state.reported : undefined);
    if (statusToReport === undefined) return;
    safeSendMessage({ action: 'STATUS_REPORT', provider, payload: { loggedIn: statusToReport } });
  }

  async function sendMessage(text: string, requestId?: string, workflowId?: string): Promise<void> {
    if (!text.trim()) throw new Error(encodeError('error.empty_message'));
    if (waitingForResponse) throw new Error(encodeError('error.response_in_progress', { provider }));

    const input = await retryLookup(queryInput, INPUT_TIMEOUT_MS, isContextValid);
    if (!input) {
      const reason = encodeError('error.input_not_found', { provider });
      finishWithError(reason, requestId, workflowId);
      throw new Error(reason);
    }

    const existingResponses = Array.from(document.querySelectorAll(responseSelectors.join(', ')));
    responseBaselineEls = new Set(existingResponses);
    userMessageBaselineEls = new Set(queryUserMessages());
    waitingForResponse = true;
    activeRequestId = requestId;
    activeWorkflowId = workflowId;
    lastResponseText = '';
    sawGenerationActivity = false;
    responseWaitStartedAt = Date.now();
    activePromptText = text;
    lastActivatedInput = undefined;
    startResponsePolling();

    const injectionStartedAt = Date.now();
    try {
      if (!isActiveRequest(requestId)) throw new Error('request cancelled before input injection');
      await injectInput(input, text);
      await Promise.resolve();
      if (!isActiveRequest(requestId)) throw new Error('request cancelled during input injection');
      assertInputLanded(input, text);
    } catch (error) {
      finishWithError(encodeError('error.input_injection_failed', { provider, detail: errorMessage(error) }), requestId, workflowId);
      throw error;
    }

    const delay = Math.max(0, PRE_SEND_DELAY_MS - (Date.now() - injectionStartedAt));
    scheduleForRequest(() => {
      void (async () => {
        const firstAttempt = await activateSend(text, requestId);
        scheduleForRequest(
          () => void retrySendIfStillPending(text, firstAttempt, requestId),
          SEND_RETRY_DELAY_MS,
          requestId,
        );
      })();
    }, delay, requestId);
  }

  async function retrySendIfStillPending(text: string, firstAttempt: SendActivationResult, requestId?: string): Promise<void> {
    if (!isActiveRequest(requestId) || sendStarted()) return;
    if (firstAttempt.ok && await waitForSendConfirmation(requestId, SEND_CONFIRMATION_GRACE_MS)) return;
    if (!isActiveRequest(requestId)) return;
    const retryAttempt = await activateSend(text, requestId);
    if (!isActiveRequest(requestId)) return;
    if (!retryAttempt.ok) {
      finishWithError(encodeError('error.send_failed', { provider, detail: retryAttempt.detail ?? firstAttempt.detail ?? retryAttempt.path }));
      return;
    }
    scheduleForRequest(
      () => void verifySendAfterRetry(text, requestId),
      SEND_VERIFY_DELAY_MS,
      requestId,
    );
  }

  async function waitForSendConfirmation(requestId: string | undefined, timeoutMs: number): Promise<boolean> {
    const startedAt = Date.now();
    while (isActiveRequest(requestId) && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (isActiveRequest(requestId) && sendStarted()) return true;
    }
    return false;
  }

  async function verifySendAfterRetry(text: string, requestId?: string): Promise<void> {
    if (!isActiveRequest(requestId) || sendStarted()) return;
    if (await waitForSendConfirmation(requestId, SEND_CONFIRMATION_GRACE_MS)) return;
    if (!isActiveRequest(requestId)) return;
    let currentInput: Element | null;
    try {
      currentInput = await prepareLiveInput(text, requestId);
    } catch (error) {
      finishWithError(encodeError('error.send_failed', { provider, detail: errorMessage(error) }));
      return;
    }
    if (!isActiveRequest(requestId)) return;
    if (!currentInput) {
      finishWithError(encodeError('error.input_disappeared', { provider }));
      return;
    }
    lastActivatedInput = currentInput;
    const enterOk = dispatchEnter(currentInput);
    if (!enterOk) {
      finishWithError(encodeError('error.send_failed', { provider, detail: 'Enter dispatch failed' }));
      return;
    }
    scheduleForRequest(() => {
      if (!isActiveRequest(requestId) || sendStarted()) return;
      finishWithError(encodeError('error.send_rejected', { provider }));
    }, SEND_VERIFY_DELAY_MS, requestId);
  }

  async function activateSend(text: string, requestId?: string): Promise<SendActivationResult> {
    let input: Element | null;
    try {
      input = await prepareLiveInput(text, requestId);
    } catch (error) {
      return { ok: false, path: 'enter-key', detail: errorMessage(error) };
    }
    if (!input) return { ok: false, path: 'enter-key', detail: 'input disappeared' };
    lastActivatedInput = input;
    const sendButton = await retryLookup(
      () => querySendButton(input),
      SEND_BUTTON_TIMEOUT_MS,
      () => isActiveRequest(requestId),
    );
    if (!isActiveRequest(requestId)) return { ok: false, path: 'enter-key', detail: 'request cancelled' };
    if (sendButton && !isDisabled(sendButton) && clickElement(sendButton)) return { ok: true, path: 'button-click' };
    const ok = dispatchEnter(input);
    return { ok, path: 'enter-key', detail: ok ? undefined : 'Enter dispatch failed' };
  }

  async function prepareLiveInput(text: string, requestId?: string): Promise<Element | null> {
    if (!isActiveRequest(requestId)) return null;
    const input = await retryLookup(
      queryInput,
      INPUT_TIMEOUT_MS,
      () => isActiveRequest(requestId),
    );
    if (!input || !isActiveRequest(requestId)) return null;
    if (composerTextMatches(input, text)) return input;
    if (getInputText(input).trim()) throw new Error('live editor contains different text');
    if (!isActiveRequest(requestId)) return null;
    await injectInput(input, text);
    await Promise.resolve();
    if (!isActiveRequest(requestId)) return null;
    assertInputLanded(input, text);
    return input;
  }

  function querySendButton(input: Element): Element | null {
    const container = input.closest?.('form, fieldset, [data-testid*="composer"], [class*="composer"], [class*="input-area"]');
    if (container) {
      const local = queryFirst(config.sendButtonSelectors, container, true, config.sendButtonFilter);
      if (local) return local;
    }
    return queryFirst(config.sendButtonSelectors, document, true, config.sendButtonFilter);
  }

  function queryUserMessages(): Element[] {
    const selectors = config.userMessageSelectors ?? [];
    return selectors.length ? Array.from(document.querySelectorAll(selectors.join(', '))) : [];
  }

  function hasNewMatchingUserMessage(): boolean {
    return queryUserMessages().some((element) => (
      !userMessageBaselineEls.has(element)
      && contentMatchesPrompt(element.textContent ?? '', activePromptText)
    ));
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
    const hasNewUserMessage = hasNewMatchingUserMessage();
    if (hasNewUserMessage) {
      sawGenerationActivity = true;
      return true;
    }
    const input = queryInput();
    const cleared = Boolean(input && !getInputText(input).trim());
    const confirmedByClear = cleared && clearedComposerConfirmsSend(
      lastActivatedInput,
      input,
      Boolean(config.requireSameComposerForClearConfirmation),
      hasNewUserMessage,
    );
    if (confirmedByClear) sawGenerationActivity = true;
    return confirmedByClear;
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
      // Claude/SPA composers mount several seconds after load; re-report the moment
      // login state flips so the card reaches "ready" without waiting for the 10s poll.
      reportStatus();
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
      // sawGenerationActivity 只代表「送出去了」（輸入框被清空也算），不代表真的產生過內容，
      // 所以這條路徑必須等滿寬限期才收尾，否則慢的模型會在送出後幾秒就被判定沒有回應。
      if (!sawGenerationActivity || responseTimeout !== undefined) return;
      if (Date.now() - responseWaitStartedAt < NO_RESPONSE_GRACE_MS) return;
      responseTimeout = setTimeout(() => {
        const finalText = getLatestResponseText();
        if (finalText) {
          lastResponseText = finalText;
          finishResponse();
          return;
        }
        // 報錯而非填佔位字串：假答案會被背景當成正常結果，餵進下一棒的 prompt。
        finishWithError(encodeError('error.no_response_text', { provider }));
      }, doneDelay);
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

  function stopGeneration(requestId?: string, workflowId?: string): boolean {
    if (!shouldStopActiveRequest(activeRequestId, activeWorkflowId, requestId, workflowId)) return false;
    const stopButton = queryFirst(
      config.stopButtonSelectors ?? [],
      document,
      true,
      config.stopButtonFilter,
    );
    if (stopButton) clickElement(stopButton);
    resetResponseState();
    return true;
  }

  function resetResponseState(): void {
    waitingForResponse = false;
    clearResponseTimers();
    responseBaselineEls.clear();
    userMessageBaselineEls.clear();
    activeRequestId = undefined;
    activeWorkflowId = undefined;
    activePromptText = '';
    lastActivatedInput = undefined;
    sawGenerationActivity = false;
  }

  function isActiveRequest(requestId?: string): boolean {
    return isActiveContentRequest(
      disposed,
      runtimeState,
      scope[marker],
      waitingForResponse,
      activeRequestId,
      requestId,
    );
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
      // A service worker can restart while this content script survives. Always answer its
      // explicit probe even when our locally observed status has not changed.
      reportStatus(true);
      sendResponse({ ok: true });
      return true;
    }
    if (message.action === 'STOP_GENERATION' && (!message.provider || message.provider === provider)) {
      const stopped = stopGeneration(message.requestId, message.workflowId);
      sendResponse({ ok: stopped });
      return true;
    }
    return false;
  };

  runtimeState.dispose = cleanup;
  chrome.runtime.onMessage.addListener(runtimeListener);

  reportStatus(true);
  statusInterval = setInterval(() => reportStatus(true), 10_000);
  observeResponses();
}

async function retryLookup<T>(
  lookup: () => T | null | undefined,
  timeoutMs: number,
  shouldContinue: () => boolean = () => true,
): Promise<T | null> {
  const startedAt = Date.now();
  while (true) {
    if (!shouldContinue()) return null;
    const value = lookup();
    if (value) return value;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, Math.min(INPUT_RETRY_MS, timeoutMs - elapsed)));
  }
}

function queryFirst(
  selectors: readonly string[],
  root: ParentNode = document,
  requireVisible = false,
  filter: (element: Element) => boolean = () => true,
): Element | null {
  return firstAcceptedCandidate(
    selectors,
    (selector) => Array.from(root.querySelectorAll(selector)),
    (candidate) => (!requireVisible || isVisible(candidate)) && filter(candidate),
  );
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
  focusWithoutScroll(element);
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
    focusWithoutScroll(target);
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
  focusWithoutScroll(input as HTMLElement);
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

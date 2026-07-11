import { createContentScript } from './base';

createContentScript({
  provider: 'grok',

  inputSelectors: [
    '[data-testid="chat-input"] .ProseMirror[contenteditable="true"]',
    '[data-testid="chat-input"] [contenteditable="true"]',
    '.ProseMirror[contenteditable="true"]',
    '[contenteditable="true"].ProseMirror',
    'div.ProseMirror[contenteditable="true"]',
  ],

  sendButtonSelectors: [
    'button[data-testid="chat-submit"]',
    'button[aria-label="Submit"]',
    'form button[type="submit"]',
    'button[type="submit"]',
  ],

  responseSelectors: [
    // Grok marks assistant bubbles with data-testid (most stable)
    '[data-testid="assistant-message"] .response-content-markdown',
    '[data-testid="assistant-message"]',
    // Fallbacks
    '.response-content-markdown',
    '.message-bubble.assistant',
  ],

  stopButtonSelectors: [
    'button[data-testid="chat-stop"]',
    'button[aria-label="Stop"]',
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop response"]',
  ],

  loginDetector: () => {
    return !!(
      document.querySelector('[data-testid="chat-input"] .ProseMirror[contenteditable="true"]') ||
      document.querySelector('.ProseMirror[contenteditable="true"]') ||
      document.querySelector('[data-testid="chat-submit"]')
    );
  },

  isThinking: () => {
    // 1. Explicit stop button (when Grok is generating, submit may be replaced)
    if (document.querySelector('button[data-testid="chat-stop"]')) return true;
    if (document.querySelector('button[aria-label="Stop"]')) return true;
    if (document.querySelector('button[aria-label="Stop generating"]')) return true;
    if (document.querySelector('button[aria-label="Stop response"]')) return true;

    // 2. Streaming attribute on response container
    if (document.querySelector('[data-streaming="true"]')) return true;

    // 3. "Thinking" container exists but no "Thought for Xs" yet → still thinking
    //    Grok shows "Thinking..." while reasoning, swaps to "Thought for Ns" when done
    const thinkingContainers = document.querySelectorAll('.thinking-container');
    for (const container of thinkingContainers) {
      const text = container.textContent || '';
      if (text.includes('Thinking') && !text.includes('Thought for')) return true;
    }

    return false;
  },

  // ProseMirror injection — same approach as Claude (Grok also uses tiptap)
  injectInput: async (el: Element, text: string) => {
    const editor = el as HTMLElement;
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const clipboard = new DataTransfer();
    clipboard.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }));
    await Promise.resolve();

    if (!matches(editor.textContent ?? '', text)) {
      editor.focus();
      range.selectNodeContents(editor);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('insertText', false, text);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      await Promise.resolve();
    }

    if (!matches(editor.textContent ?? '', text)) {
      editor.replaceChildren();
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      editor.appendChild(paragraph);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  },

  // Round 5 of roundtable carries 4 rounds × 4 speakers of history — generation can
  // have natural multi-second pauses. Long doneDelay prevents premature finalization.
  doneDelay: 8000,
  chunkDebounce: 600,
});

function matches(actual: string, expected: string): boolean {
  return actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '');
}

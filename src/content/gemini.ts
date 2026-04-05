import { createContentScript } from './base';

createContentScript({
  provider: 'gemini',

  inputSelectors: [
    // Gemini uses a rich text editor
    '.ql-editor[contenteditable="true"]',
    'rich-textarea .ql-editor',
    // Newer Gemini input
    'div[contenteditable="true"][aria-label="Enter a prompt here"]',
    'div[contenteditable="true"][aria-label]',
    // Generic fallback
    '.input-area [contenteditable="true"]',
    'rich-textarea [contenteditable="true"]',
  ],

  sendButtonSelectors: [
    'button.send-button',
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
    'button[aria-label="傳送訊息"]',
    'button[aria-label="送出"]',
    'button[data-mat-icon-name="send"]',
    // Gemini's send icon button
    '.send-button-container button',
    'button mat-icon[data-mat-icon-name="send"]',
    // Newer Gemini UI patterns
    '.action-wrapper button[aria-label]',
    '.input-area-container button.send',
    'button.send-message-button',
  ],

  responseSelectors: [
    // Gemini response containers
    '.model-response-text .markdown',
    '.model-response-text',
    'model-response .markdown',
    'model-response message-content',
    // Newer Gemini
    '.response-content .markdown',
    '.message-content[data-message-id]',
  ],

  loginDetector: () => {
    return !!(
      document.querySelector('.ql-editor[contenteditable="true"]') ||
      document.querySelector('rich-textarea [contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][aria-label="Enter a prompt here"]')
    );
  },

  // Detect if Gemini is still generating (thinking indicator or stop button)
  isThinking: () => {
    // Gemini shows a loading/thinking indicator while generating
    if (document.querySelector('.loading-indicator')) return true;
    if (document.querySelector('.thinking-indicator')) return true;
    if (document.querySelector('mat-progress-bar')) return true;
    // Stop button visible during generation
    if (document.querySelector('button[aria-label="Stop response"]')) return true;
    if (document.querySelector('button[aria-label="Stop"]')) return true;
    if (document.querySelector('button[aria-label="停止回應"]')) return true;
    // Gemini's streaming dots
    if (document.querySelector('.response-streaming')) return true;
    if (document.querySelector('[data-test-id="response-loading"]')) return true;
    return false;
  },

  // Gemini rich text editor injection — must trigger Angular change detection
  injectInput: (el: Element, text: string) => {
    const editor = el as HTMLElement;
    editor.focus();

    // Clear existing content
    editor.innerHTML = '';

    // Convert text to paragraphs (Quill/rich editor needs block elements)
    const lines = text.split('\n');
    const fragment = document.createDocumentFragment();
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line || '\u00A0'; // non-breaking space for empty lines
      fragment.appendChild(p);
    }
    editor.appendChild(fragment);

    // Fire events to trigger Angular/Quill change detection
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));

    // Also try execCommand approach for frameworks that need it
    setTimeout(() => {
      // Verify text was injected — if not, try execCommand
      if (!editor.textContent?.trim()) {
        console.log('[Multi-AI Chat] gemini: innerHTML failed, trying execCommand');
        editor.focus();
        document.execCommand('insertText', false, text);
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      }
    }, 150);
  },

  doneDelay: 4000,
  chunkDebounce: 600,
});

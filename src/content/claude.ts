import { createContentScript } from './base';

createContentScript({
  provider: 'claude',

  inputSelectors: [
    // ProseMirror editor used by Claude
    '.ProseMirror[contenteditable="true"]',
    '[contenteditable="true"].ProseMirror',
    'div.ProseMirror',
    // Fallback
    'fieldset div[contenteditable="true"]',
  ],

  sendButtonSelectors: [
    'button[aria-label="Send Message"]',
    'button[aria-label="Send message"]',
    'button[aria-label="Send"]',
    // The send button is often the last button in the input area
    'fieldset button[type="button"]:last-of-type',
  ],

  responseSelectors: [
    // Claude response containers (actual class: font-claude-response)
    '.font-claude-response',
    '[data-is-streaming] .font-claude-response',
    // Fallback
    '.font-claude-message',
  ],

  loginDetector: () => {
    return !!(
      document.querySelector('.ProseMirror[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"].ProseMirror')
    );
  },

  // Detect if Claude is still generating (streaming indicator or stop button)
  isThinking: () => {
    // data-is-streaming="true" on response container (NOT just [data-is-streaming] — "false" also matches)
    if (document.querySelector('[data-is-streaming="true"]')) return true;
    // Stop button visible during generation
    if (document.querySelector('button[aria-label="Stop Response"]')) return true;
    if (document.querySelector('button[aria-label="Stop response"]')) return true;
    if (document.querySelector('button[aria-label="Stop"]')) return true;
    return false;
  },

  // Custom input for ProseMirror — it needs special handling
  injectInput: (el: Element, text: string) => {
    const editor = el as HTMLElement;
    editor.focus();

    // Clear existing content
    const paragraphs = editor.querySelectorAll('p');
    paragraphs.forEach(p => p.remove());

    // Create a new paragraph with the text
    const p = document.createElement('p');
    p.textContent = text;
    editor.appendChild(p);

    // Trigger input event for ProseMirror to pick up
    editor.dispatchEvent(new Event('input', { bubbles: true }));

    // Also try the clipboard approach for better ProseMirror compatibility
    // Focus and select all, then paste
    setTimeout(() => {
      editor.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Use DataTransfer to simulate paste
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      editor.dispatchEvent(pasteEvent);
    }, 100);
  },

  doneDelay: 5000,
  chunkDebounce: 500,
});

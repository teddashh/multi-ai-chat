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

  stopButtonSelectors: [
    'button[aria-label="Stop Response"]',
    'button[aria-label="Stop response"]',
    'button[aria-label="Stop"]',
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

  doneDelay: 5000,
  chunkDebounce: 500,
});

function matches(actual: string, expected: string): boolean {
  return actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '');
}

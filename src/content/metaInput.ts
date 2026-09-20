import { focusWithoutScroll } from './focusWithoutScroll';

export async function injectMetaInput(input: Element, text: string): Promise<void> {
  const editor = input as HTMLElement;
  focusWithoutScroll(editor);
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    const prototype = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, text);
    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: text,
    }));
  } else {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Let Lexical observe the selection before replacing any existing draft.
    await nextTask();
    const clipboard = new DataTransfer();
    clipboard.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: clipboard,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));
    // Lexical owns the DOM. execCommand plus a synthetic input event inserts
    // twice; directly replacing its children can be reconciled back or duplicated.
  }
  // Await editor reconciliation before base.ts verifies the text. If paste is
  // ignored/rejected, the existing assertion must fail instead of sending a draft.
  await nextTask();
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

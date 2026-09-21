import { focusWithoutScroll } from './focusWithoutScroll';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

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
  // Shared compact matching treats "hello world" as "hello\nworld". Catch that
  // false positive here so a leftover draft cannot be sent as a multiline prompt.
  assertMetaPromptLanded(input, text);
}

export function readMetaComposerText(input: Element): string {
  if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
    return input.value;
  }
  return readContentEditable(input);
}

export function metaComposerMatches(actual: string, expected: string): boolean {
  return compactText(actual) === compactText(expected) && lineKey(actual) === lineKey(expected);
}

function assertMetaPromptLanded(input: Element, expected: string): void {
  const actual = readMetaComposerText(input);
  if (compactText(actual) !== compactText(expected)) return;
  if (lineKey(actual) !== lineKey(expected)) {
    throw new Error('editor text did not match the requested prompt');
  }
}

function compactText(value: string): string {
  return value.replace(/\s+/g, '');
}

function lineKey(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/\n+$/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ''))
    .join('\n');
}

function readContentEditable(editor: Element): string {
  const nodes = Array.from(editor.childNodes ?? []);
  if (!nodes.length) return editor.textContent ?? '';
  const elements = nodes.filter((node): node is Element => node.nodeType === ELEMENT_NODE);
  const onlyBlocks = elements.length === nodes.length && elements.every((el) => BLOCK_TAGS.has(el.tagName));
  if (onlyBlocks) {
    return elements.map((el) => {
      const text = serializeInline(el);
      return text === '\n' ? '' : text.replace(/\n+$/g, '');
    }).join('\n');
  }
  return serializeInline(editor);
}

function serializeInline(element: Element): string {
  let output = '';
  for (const child of Array.from(element.childNodes ?? [])) {
    if (child.nodeType === TEXT_NODE) {
      output += child.textContent ?? '';
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const nested = child as Element;
    output += nested.tagName === 'BR' ? '\n' : serializeInline(nested);
  }
  return output;
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface FocusableElement {
  focus(options?: FocusOptions): void;
}

export function focusWithoutScroll(element: FocusableElement): void {
  try {
    element.focus({ preventScroll: true });
  } catch {
    // Chrome 114 supports preventScroll, but keep a fallback for unusual provider wrappers.
    element.focus();
  }
}

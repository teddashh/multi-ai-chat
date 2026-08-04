import type { ThemeMode } from './types';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

export function applyTheme(mode: ThemeMode): void {
  const dark = mode === 'dark' || (mode === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** 回傳解除監聽的函式；system 模式下 OS 切換主題要即時反映 */
export function watchSystemTheme(onChange: () => void): () => void {
  darkQuery.addEventListener('change', onChange);
  return () => darkQuery.removeEventListener('change', onChange);
}

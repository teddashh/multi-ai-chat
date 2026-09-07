import type { AIProvider } from './types';

const PROVIDER_BY_HOSTNAME: Readonly<Record<string, AIProvider>> = {
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'claude.ai': 'claude',
  'gemini.google.com': 'gemini',
  'grok.com': 'grok',
};

export function getProviderFromUrl(value: string): AIProvider | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return PROVIDER_BY_HOSTNAME[url.hostname] ?? null;
  } catch {
    return null;
  }
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { AI_PROVIDERS, CHAT_MODES, DEFAULT_DEBATE_ROLES } from '../src/shared/constants.ts';
import { LOCALE_LABELS, SUPPORTED_LOCALES, setLocale, t } from '../src/shared/i18n.ts';
import type { AIConnection, AIProvider } from '../src/shared/types.ts';

const ALL_PROVIDERS: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok', 'meta'];
const THEME_MODES = ['system', 'light', 'dark'] as const;
const activeProviders: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok'];

function loadComponent(
  relativePath: string,
  reactImpl: typeof React = React,
): { default: React.ComponentType<any> } {
  const module = { exports: {} as { default: React.ComponentType<any> } };
  const code = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(`(function(require, module, exports) {${code}\n})`)(
    (id: string) => {
      if (id === 'react') return reactImpl;
      if (id === '../../shared/i18n') return { t, LOCALE_LABELS, SUPPORTED_LOCALES };
      if (id === '../../shared/constants') return { AI_PROVIDERS, CHAT_MODES };
      if (id === '../../shared/providerSelection') return { ALL_PROVIDERS };
      if (id === '../../shared/theme') return { THEME_MODES };
      if (id === '../../shared/hackmd') {
        return { getHackMDToken: async () => null, setHackMDToken: async () => {}, clearHackMDToken: async () => {} };
      }
      throw new Error(`Unexpected dependency: ${id}`);
    },
    module,
    module.exports,
  );
  return module.exports;
}

type TextareaHandlers = {
  onChange?: (event: { target: { value: string } }) => void;
  onKeyDown?: (event: {
    key: string;
    shiftKey: boolean;
    preventDefault: () => void;
    nativeEvent: { isComposing: boolean; keyCode: number };
  }) => void;
};

function mountInputBar(overrides: Record<string, unknown> = {}) {
  const captured: { textarea?: TextareaHandlers; send?: { onClick?: () => void } } = {};
  const reactImpl = new Proxy(React, {
    get(target, prop, receiver) {
      if (prop === 'createElement') {
        return (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => {
          if (type === 'textarea' && props) captured.textarea = props as TextareaHandlers;
          const label = props?.children ?? children[0];
          if (type === 'button' && label === t('input.send')) captured.send = props as { onClick?: () => void };
          return React.createElement(type as React.ElementType, props, ...children);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  const InputBar = loadComponent('../src/sidepanel/components/InputBar.tsx', reactImpl as typeof React).default;
  const sent: string[] = [];
  setLocale('en');
  const markup = renderToStaticMarkup(React.createElement(InputBar, {
    onSend: (text: string) => sent.push(text),
    onCancel: () => {},
    disabled: false,
    isProcessing: false,
    ...overrides,
  }));
  return { markup, sent, textarea: captured.textarea!, send: captured.send! };
}

function enterEvent(overrides: { isComposing?: boolean; keyCode?: number; shiftKey?: boolean } = {}) {
  let prevented = false;
  return {
    event: {
      key: 'Enter',
      shiftKey: Boolean(overrides.shiftKey),
      preventDefault: () => { prevented = true; },
      nativeEvent: { isComposing: Boolean(overrides.isComposing), keyCode: overrides.keyCode ?? 13 },
    },
    wasPrevented: () => prevented,
  };
}

test('InputBar Enter and Send fire the real handlers once; IME confirmation does not send', () => {
  const { markup, sent, textarea, send } = mountInputBar();
  assert.match(markup, /aria-label="Message to selected AIs"/);
  assert.equal(typeof textarea.onChange, 'function');
  assert.equal(typeof textarea.onKeyDown, 'function');
  assert.equal(typeof send.onClick, 'function');

  textarea.onChange!({ target: { value: '入力法確認 日本語 한국어' } });
  const composing = enterEvent({ isComposing: true, keyCode: 13 });
  textarea.onKeyDown!(composing.event);
  assert.equal(composing.wasPrevented(), false);
  const keyCode229 = enterEvent({ isComposing: false, keyCode: 229 });
  textarea.onKeyDown!(keyCode229.event);
  assert.equal(keyCode229.wasPrevented(), false);
  const newline = enterEvent({ shiftKey: true });
  textarea.onKeyDown!(newline.event);
  assert.equal(newline.wasPrevented(), false);
  assert.equal(sent.length, 0);

  const first = enterEvent();
  textarea.onKeyDown!(first.event);
  assert.equal(first.wasPrevented(), true);
  const second = enterEvent();
  textarea.onKeyDown!(second.event);
  send.onClick!();
  assert.deepEqual(sent, ['入力法確認 日本語 한국어']);
});

test('InputBar Send click consumes the draft before a second click can send', () => {
  const { sent, textarea, send } = mountInputBar();
  textarea.onChange!({ target: { value: '  Hello AIs  ' } });
  send.onClick!();
  send.onClick!();
  assert.deepEqual(sent, ['Hello AIs']);
});

test('disabled InputBar handlers do not send and keep the stable accessible name', () => {
  const { markup, sent, textarea } = mountInputBar({ disabled: true, isProcessing: true });
  assert.match(markup, /aria-label="Message to selected AIs"/);
  assert.match(markup, /placeholder="Workflow is running…"/);
  textarea.onChange!({ target: { value: 'should not send' } });
  const enter = enterEvent();
  textarea.onKeyDown!(enter.event);
  assert.equal(sent.length, 0);
});

test('role buttons expose type, pressed state and a labelled group per role', () => {
  setLocale('en');
  const RoleConfig = loadComponent('../src/sidepanel/components/RoleConfig.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(RoleConfig, {
    providers: activeProviders, mode: 'debate', roles: DEFAULT_DEBATE_ROLES, onRolesChange: () => {},
  }));
  assert.equal(markup.match(/role="group"/g)?.length, 4);
  assert.match(markup, /aria-labelledby="role-label-pro"/);
  assert.match(markup, /id="role-label-pro"[^>]*>Pro</);
  assert.equal((markup.match(/aria-pressed="true"/g) ?? []).length, 4);
  assert.equal((markup.match(/aria-pressed="false"/g) ?? []).length, 12);
  assert.equal((markup.match(/type="button"/g) ?? []).length, 16);
  assert.doesNotMatch(markup, /<button(?![^>]*type="button")/);
});

test('connection buttons name status in five locales and mark checking as busy', () => {
  const ConnectionBar = loadComponent('../src/sidepanel/components/ConnectionBar.tsx').default;
  const connections = {
    chatgpt: { provider: 'chatgpt', status: 'connected' },
    claude: { provider: 'claude', status: 'checking' },
    gemini: { provider: 'gemini', status: 'login-required' },
    grok: { provider: 'grok', status: 'disconnected' },
  } as Record<AIProvider, AIConnection>;
  for (const locale of SUPPORTED_LOCALES) {
    setLocale(locale);
    const markup = renderToStaticMarkup(React.createElement(ConnectionBar, {
      providers: activeProviders, connections, onOpenLogin: () => {},
    }));
    assert.match(markup, new RegExp(`ChatGPT[\\s\\S]*${t('connection.connected', undefined, locale)}`));
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, new RegExp(`Claude[\\s\\S]*${t('connection.checking', undefined, locale)}`));
    assert.match(markup, new RegExp(`Gemini[\\s\\S]*${t('connection.login', undefined, locale)}`));
    assert.match(markup, new RegExp(`Grok[\\s\\S]*${t('connection.open', undefined, locale)}`));
    if (locale !== 'en') {
      assert.notEqual(t('connection.checking', undefined, locale), t('connection.checking', undefined, 'en'));
    }
  }
});

test('open Settings dialog describes loading token and wires token error ids', () => {
  setLocale('en');
  const SettingsModal = loadComponent('../src/sidepanel/components/SettingsModal.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(SettingsModal, {
    isOpen: true, locale: 'en', onLocaleChange: () => {}, theme: 'system', onThemeChange: () => {},
    standbyProvider: 'meta', onStandbyChange: async () => {}, providerSelectionDisabled: false, onClose: () => {},
  }));
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="settings-title"/);
  assert.match(markup, /id="hackmd-token"[^>]*disabled=""/);
  assert.match(markup, /id="hackmd-token"[^>]*aria-describedby="settings-token-status"/);
  assert.match(markup, /id="hackmd-token"[^>]*autoComplete="off"/);
  assert.match(markup, /id="settings-token-status" role="status"/);
  assert.match(markup, /id="standby-provider"[^>]*aria-describedby="standby-help"/);
  assert.match(markup, /id="standby-help"/);
  const source = readFileSync(new URL('../src/sidepanel/components/SettingsModal.tsx', import.meta.url), 'utf8');
  assert.match(source, /id="settings-token-error"/);
  assert.match(source, /aria-invalid=\{Boolean\(tokenErrorKey\) \|\| undefined\}/);
  assert.match(source, /tokenErrorKey \? 'settings-token-error'/);
  assert.equal(renderToStaticMarkup(React.createElement(SettingsModal, {
    isOpen: false, locale: 'en', onLocaleChange: () => {}, theme: 'system', onThemeChange: () => {},
    standbyProvider: 'meta', onStandbyChange: async () => {}, providerSelectionDisabled: false, onClose: () => {},
  })), '');
});

test('mode selector keeps a named group with exactly one pressed mode', () => {
  setLocale('en');
  const ModeSelector = loadComponent('../src/sidepanel/components/ModeSelector.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(ModeSelector, { mode: 'coding', onModeChange: () => {} }));
  assert.match(markup, /role="group" aria-label="Chat mode"/);
  assert.equal((markup.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((markup.match(/aria-pressed="false"/g) ?? []).length, 4);
  assert.match(markup, />Coding<\/span>/);
});

test('ja, de and ko no longer fall back to English for product strings zh already translated', () => {
  const params = { provider: 'ChatGPT', providers: 'ChatGPT · Claude', ready: 'Meta AI', detail: 'closed', seconds: 30, status: '401' };
  const keys = [
    'session.delete', 'settings.hackmd.label', 'connection.connect_all',
    'error.input_not_found', 'error.input_injection_failed', 'error.input_disappeared',
    'error.send_failed', 'error.send_rejected', 'error.no_response_text', 'error.response_in_progress',
    'error.empty_message', 'error.not_ready', 'error.navigated_away', 'error.reloaded', 'error.tab_closed',
    'error.timeout', 'error.no_target', 'error.worker_stopped', 'error.hackmd_failed', 'error.hackmd_no_link',
  ];
  for (const locale of ['ja', 'de', 'ko'] as const) {
    for (const key of keys) {
      const text = t(key, params, locale);
      assert.notEqual(text, key, `${locale} ${key}`);
      assert.doesNotMatch(text, /\{\w+\}/);
      if (key !== 'error.hackmd_failed') {
        assert.notEqual(text, t(key, params, 'en'), `${locale} ${key} must not fall back to English`);
      }
    }
  }
  for (const key of ['app.title', 'settings.sponsored', 'settings.author', 'settings.website']) {
    assert.equal(t(key, undefined, 'ja'), t(key, undefined, 'en'));
  }
});

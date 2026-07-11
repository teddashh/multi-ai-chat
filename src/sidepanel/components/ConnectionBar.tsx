import React from 'react';
import type { AIProvider, AIConnection } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';
import { t } from '../../shared/i18n';

interface Props {
  connections: Record<AIProvider, AIConnection>;
  onOpenLogin: (provider: AIProvider) => void;
}

const providers: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok'];

export default function ConnectionBar({ connections, onOpenLogin }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {providers.map((provider) => {
        const connection = connections[provider];
        const info = AI_PROVIDERS[provider];
        const ready = connection.status === 'connected';
        const checking = connection.status === 'checking';
        const status = ready ? t('connection.connected') : checking ? t('connection.checking') : connection.status === 'login-required' ? t('connection.login') : t('connection.open');
        return (
          <button
            key={provider}
            type="button"
            onClick={() => onOpenLogin(provider)}
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${ready ? 'bg-emerald-500' : checking ? 'animate-pulse bg-sky-400' : 'bg-slate-300'}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-slate-800">{info.name}</span>
              <span className="block truncate text-[10px] text-slate-500">{status}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';
import type { ChatMode } from '../../shared/types';
import { CHAT_MODES } from '../../shared/constants';
import { t } from '../../shared/i18n';

interface Props {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const modes: ChatMode[] = ['free', 'debate', 'consult', 'coding', 'roundtable'];

export default function ModeSelector({ mode, onModeChange, disabled = false }: Props) {
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {modes.map((candidate) => {
          const active = mode === candidate;
          return (
            <button
              key={candidate}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(candidate)}
              className={`min-w-[88px] flex-1 rounded-lg border px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'border-sky-400 bg-sky-50 text-sky-950 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="block text-base leading-none">{CHAT_MODES[candidate].icon}</span>
              <span className="mt-1 block text-[11px] font-semibold leading-tight">{t(`mode.${candidate}`)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{t('mode.details')}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{t(`mode.${mode}.desc`)}</p>
      </div>
    </div>
  );
}

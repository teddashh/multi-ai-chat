import React from 'react';
import type { AIProvider, ChatMode, ModeRoles } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';
import { t } from '../../shared/i18n';

interface Props {
  mode: ChatMode;
  roles: ModeRoles;
  onRolesChange: (roles: ModeRoles) => void;
}

const ROLE_KEYS: Record<string, Record<string, string>> = {
  debate: { pro: 'role.pro', con: 'role.con', judge: 'role.judge', summary: 'role.summary' },
  consult: { first: 'role.first', second: 'role.second', reviewer: 'role.reviewer', summary: 'role.summary' },
  coding: { planner: 'role.planner', reviewer: 'role.reviewer', coder: 'role.coder', tester: 'role.tester' },
  roundtable: { first: 'role.first_speaker', second: 'role.second_speaker', third: 'role.third_speaker', fourth: 'role.fourth_speaker' },
};

const providers: AIProvider[] = ['chatgpt', 'claude', 'gemini', 'grok'];

export default function RoleConfig({ mode, roles, onRolesChange }: Props) {
  const labels = ROLE_KEYS[mode];
  if (!labels) return null;

  const handleChange = (roleKey: string, provider: AIProvider) => {
    const current = roles as unknown as Record<string, AIProvider>;
    const previousProvider = current[roleKey];
    const conflictingRole = Object.keys(current).find((candidate) => candidate !== roleKey && current[candidate] === provider);
    const next = { ...current, [roleKey]: provider };
    if (conflictingRole) next[conflictingRole] = previousProvider;
    onRolesChange(next as unknown as ModeRoles);
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
      {Object.entries(labels).map(([roleKey, labelKey]) => (
        <div key={roleKey} className="flex items-start gap-2">
          <span className="w-20 flex-none pt-1 text-xs text-slate-600">{t(labelKey)}</span>
          <div className="grid grid-cols-2 gap-1 flex-1">
            {providers.map((p) => {
              const isSelected = (roles as unknown as Record<string, AIProvider>)[roleKey] === p;
              const info = AI_PROVIDERS[p];
              return (
                <button
                  key={p}
                  onClick={() => handleChange(roleKey, p)}
                  className={`px-2 py-0.5 rounded text-xs transition-all text-center ${
                    isSelected
                      ? 'font-semibold ring-1 ring-current'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                  style={isSelected ? { backgroundColor: info.color + '33', color: info.color } : {}}
                >
                  {info.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

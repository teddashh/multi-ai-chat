import React from 'react';
import type { AIProvider, ChatMode, ModeRoles } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';

interface Props {
  mode: ChatMode;
  roles: ModeRoles;
  onRolesChange: (roles: ModeRoles) => void;
}

const ROLE_LABELS: Record<string, Record<string, string>> = {
  debate: { pro: '正方', con: '反方', summary: '總結' },
  consult: { first: '先答', reviewer: '審查', summary: '總結' },
  coding: { planner: '規劃', reviewer: '審查', coder: 'Coder/QC' },
};

const providers: AIProvider[] = ['chatgpt', 'claude', 'gemini'];

export default function RoleConfig({ mode, roles, onRolesChange }: Props) {
  const labels = ROLE_LABELS[mode];
  if (!labels) return null;

  const handleChange = (roleKey: string, provider: AIProvider) => {
    onRolesChange({ ...roles, [roleKey]: provider } as ModeRoles);
  };

  return (
    <div className="mt-2 p-2 bg-gray-800 rounded-lg space-y-1.5">
      {Object.entries(labels).map(([roleKey, label]) => (
        <div key={roleKey} className="flex items-center justify-between">
          <span className="text-xs text-gray-300 w-16">{label}</span>
          <div className="flex gap-1">
            {providers.map((p) => {
              const isSelected = (roles as unknown as Record<string, AIProvider>)[roleKey] === p;
              const info = AI_PROVIDERS[p];
              return (
                <button
                  key={p}
                  onClick={() => handleChange(roleKey, p)}
                  className={`px-2 py-0.5 rounded text-xs transition-all ${
                    isSelected
                      ? 'text-white font-bold'
                      : 'text-gray-500 hover:text-gray-300'
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

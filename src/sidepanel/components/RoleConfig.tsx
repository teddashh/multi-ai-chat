import React from 'react';
import type { AIProvider, ChatMode, ModeRoles } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';
import { t } from '../../shared/i18n';

interface Props {
  mode: ChatMode;
  roles: ModeRoles;
  onRolesChange: (roles: ModeRoles) => void;
}

const ROLE_LABELS: Record<string, Record<string, string>> = {
  debate: { pro: t('role.pro'), con: t('role.con'), summary: t('role.summary') },
  consult: { first: t('role.first'), reviewer: t('role.reviewer'), summary: t('role.summary') },
  coding: { planner: t('role.planner'), reviewer: t('role.reviewer'), coder: t('role.coder') },
  roundtable: { first: t('role.first_speaker'), second: t('role.second_speaker'), third: t('role.third_speaker') },
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

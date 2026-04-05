import React from 'react';
import type { ChatMode } from '../../shared/types';
import { CHAT_MODES } from '../../shared/constants';

interface Props {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export default function ModeSelector({ mode, onModeChange }: Props) {
  const modes: ChatMode[] = ['free', 'debate', 'consult', 'coding', 'roundtable'];

  return (
    <div className="flex gap-1">
      {modes.map((m) => {
        const info = CHAT_MODES[m];
        const isActive = mode === m;

        return (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
            title={info.description}
          >
            <span className="mr-1">{info.icon}</span>
            {info.name}
          </button>
        );
      })}
    </div>
  );
}

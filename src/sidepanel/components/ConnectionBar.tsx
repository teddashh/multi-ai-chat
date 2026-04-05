import React from 'react';
import type { AIProvider, AIConnection } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';

interface Props {
  connections: Record<AIProvider, AIConnection>;
  onOpenLogin: (provider: AIProvider) => void;
}

export default function ConnectionBar({ connections, onOpenLogin }: Props) {
  const providers: AIProvider[] = ['chatgpt', 'claude', 'gemini'];

  return (
    <div className="flex gap-2">
      {providers.map((provider) => {
        const conn = connections[provider];
        const info = AI_PROVIDERS[provider];
        const isConnected = conn.status === 'connected';

        return (
          <button
            key={provider}
            onClick={() => !isConnected && onOpenLogin(provider)}
            className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isConnected
                ? 'bg-gray-800 border border-gray-600 cursor-default'
                : 'bg-gray-800 border border-gray-700 hover:border-gray-500 cursor-pointer'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className="truncate" style={{ color: isConnected ? info.color : '#9ca3af' }}>
              {info.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

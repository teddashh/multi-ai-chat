import React, { useEffect, useRef } from 'react';
import type { ChatMessage, ChatMode } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';

interface Props {
  messages: ChatMessage[];
  mode: ChatMode;
}

export default function ChatArea({ messages, mode }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-4">
        <div className="text-center">
          <p className="text-2xl mb-2">💬</p>
          <p>連線 AI 後開始對話</p>
          <p className="text-xs text-gray-600 mt-1">目前模式：{mode}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 rounded-2xl rounded-br-md px-4 py-2 max-w-[85%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const provider = message.provider;
  // 'system' is used for error messages from the background (not a real AIProvider key);
  // the service worker casts it as AIProvider so we must widen to string for the comparison.
  const providerStr = provider as string | undefined;
  const info = providerStr && providerStr in AI_PROVIDERS
    ? AI_PROVIDERS[providerStr as keyof typeof AI_PROVIDERS]
    : providerStr === 'system'
      ? { name: 'System', color: '#6b7280' }
      : null;
  const isStreaming = message.id.endsWith('-streaming');

  return (
    <div className="flex justify-start">
      <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%] border border-gray-700">
        {info && (
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-xs font-bold"
              style={{ color: info.color }}
            >
              {info.name}
            </span>
            {message.modeRole && (
              <span className="text-[10px] text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                {message.modeRole}
              </span>
            )}
            {isStreaming && (
              <span className="text-[10px] text-yellow-400 animate-pulse">typing...</span>
            )}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

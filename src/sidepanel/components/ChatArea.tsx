import React, { useEffect, useRef } from 'react';
import type { ChatMessage, ChatMode } from '../../shared/types';
import { AI_PROVIDERS } from '../../shared/constants';
import { t } from '../../shared/i18n';
import MarkdownText from './MarkdownText';
import { isTranscriptNearEnd, scrollTranscriptToEnd } from '../transcriptScroll';

interface Props {
  messages: ChatMessage[];
  mode: ChatMode;
  conversationId: string;
}

export default function ChatArea({ messages, mode, conversationId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToEndRef = useRef(true);
  const previousConversationIdRef = useRef<string>();
  const previousMessageIdRef = useRef<string>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const conversationChanged = previousConversationIdRef.current !== conversationId;
    const latestMessage = messages[messages.length - 1];
    const userSentMessage = latestMessage?.role === 'user' && previousMessageIdRef.current !== latestMessage.id;
    previousConversationIdRef.current = conversationId;
    previousMessageIdRef.current = latestMessage?.id;
    if (conversationChanged || userSentMessage) stickToEndRef.current = true;
    if (stickToEndRef.current) scrollTranscriptToEnd(container);
  }, [conversationId, messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <div className="max-w-xs">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-2xl">{mode === 'free' ? '⚡' : '💬'}</div>
          <h2 className="mt-3 text-sm font-semibold text-slate-800">{t('chat.empty')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('chat.empty.help')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
      onScroll={(event) => {
        stickToEndRef.current = isTranscriptNearEnd(event.currentTarget);
      }}
    >
      {messages.map((message) => <MessageCard key={message.id} message={message} />)}
    </div>
  );
}

function MessageCard({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <article className="ml-8 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">{t('chat.you')}</div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">{message.content}</div>
      </article>
    );
  }

  const provider = message.provider as string | undefined;
  const info = provider && provider in AI_PROVIDERS
    ? AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS]
    : { name: t('chat.system'), color: '#64748b' };
  const streaming = message.id.endsWith('-streaming');
  const role = message.modeRole ? t(message.modeRole) : '';

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-bold" style={{ color: info.color }}>{info.name}</span>
        {role && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{role}</span>}
        {streaming && <span className="animate-pulse text-[10px] text-amber-600">{t('chat.typing')}</span>}
      </div>
      <div className="text-sm text-slate-800"><MarkdownText text={message.content} /></div>
    </article>
  );
}

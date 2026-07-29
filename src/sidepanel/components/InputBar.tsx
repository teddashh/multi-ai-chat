import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../shared/i18n';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  disabled: boolean;
  isProcessing: boolean;
}

export default function InputBar({ onSend, onCancel, disabled, isProcessing }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
  }, [text]);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="flex-none border-t border-slate-200 bg-white p-3">
      <div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? (isProcessing ? t('input.placeholder.processing') : t('input.placeholder.connect')) : t('input.placeholder')}
          disabled={disabled}
          rows={2}
          className="block max-h-[140px] min-h-[52px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        <div className="mt-1 flex items-center justify-end gap-2">
          {isProcessing && <button type="button" onClick={onCancel} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">{t('input.stop')}</button>}
          <button type="button" onClick={submit} disabled={disabled || !text.trim()} className="rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">{t('input.send')}</button>
        </div>
      </div>
    </div>
  );
}

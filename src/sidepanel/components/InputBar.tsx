import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../shared/i18n';

interface Props {
  onSend: (text: string) => void;
  onCancel: () => void;
  disabled: boolean;
  isProcessing: boolean;
  readinessNotice?: string;
  onOpenUnready?: () => void;
  isOpeningUnready?: boolean;
  readinessOpenError?: string;
}

export default function InputBar({ onSend, onCancel, disabled, isProcessing, readinessNotice, onOpenUnready, isOpeningUnready = false, readinessOpenError }: Props) {
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
      {readinessNotice && (
        <div className="mb-2">
          <p id="input-readiness" role="status" className="text-xs leading-relaxed text-amber-800">{readinessNotice}</p>
          {onOpenUnready && <button type="button" onClick={onOpenUnready} disabled={isOpeningUnready || isProcessing} aria-describedby="input-readiness" className="mt-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50">{t(isOpeningUnready ? 'connection.opening' : 'connection.open_unready')}</button>}
          {readinessOpenError && <p role="alert" className="mt-1 text-xs leading-relaxed text-red-700">{readinessOpenError}</p>}
        </div>
      )}
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
          aria-describedby={readinessNotice ? 'input-readiness' : undefined}
          rows={2}
          className="block max-h-[140px] min-h-[52px] w-full resize-none bg-transparent px-2 py-1 text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
        />
        <div className="mt-1 flex items-center justify-end gap-2">
          {isProcessing && <button type="button" onClick={onCancel} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">{t('input.stop')}</button>}
          <button type="button" onClick={submit} disabled={disabled || !text.trim()} className="rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">{t('input.send')}</button>
        </div>
      </div>
    </div>
  );
}

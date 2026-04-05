import React, { useState, useRef, useEffect } from 'react';

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-none border-t border-gray-700 p-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? (isProcessing ? '處理中...' : '請先連線 AI') : '輸入訊息... (Enter 送出, Shift+Enter 換行)'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        {isProcessing && (
          <button
            onClick={onCancel}
            className="px-3 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-xl font-medium transition-colors"
          >
            Stop
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {isProcessing ? '⏳' : '送出'}
        </button>
      </div>
    </div>
  );
}

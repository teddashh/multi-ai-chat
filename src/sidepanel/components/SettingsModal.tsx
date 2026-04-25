import React, { useState, useEffect } from 'react';
import { getHackMDToken, setHackMDToken, clearHackMDToken } from '../../shared/hackmd';
import { t } from '../../shared/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    setLoaded(false);
    getHackMDToken().then((existing) => {
      setToken(existing ?? '');
      setLoaded(true);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = token.trim();
    if (trimmed) {
      await setHackMDToken(trimmed);
    } else {
      await clearHackMDToken();
    }
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  const handleClear = async () => {
    await clearHackMDToken();
    setToken('');
    setSaved(true);
    setTimeout(() => setSaved(false), 700);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold mb-3 text-white">{t('settings.title')}</h2>

        <label className="block text-xs font-medium mb-1 text-gray-200">
          {t('settings.hackmd.label')}
        </label>
        <input
          type="password"
          value={loaded ? token : ''}
          onChange={(e) => setToken(e.target.value)}
          placeholder="hmd_xxxxxxxxxxxxxxxx"
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
          {t('settings.hackmd.help')}{' '}
          <a
            href="https://hackmd.io/settings#api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            hackmd.io/settings → API
          </a>
        </p>
        <p className="text-xs text-gray-500 mt-1">{t('settings.hackmd.local')}</p>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-red-400"
          >
            {t('settings.clear')}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white"
            >
              {t('settings.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded text-white min-w-[60px]"
            >
              {saved ? '✓' : t('settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

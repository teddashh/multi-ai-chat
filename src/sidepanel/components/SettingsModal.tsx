import React, { useEffect, useState } from 'react';
import type { Locale } from '../../shared/types';
import { getHackMDToken, setHackMDToken, clearHackMDToken } from '../../shared/hackmd';
import { LOCALE_LABELS, SUPPORTED_LOCALES, t } from '../../shared/i18n';

interface Props {
  isOpen: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, locale, onLocaleChange, onClose }: Props) {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSaved(false);
    void getHackMDToken().then((existing) => setToken(existing ?? ''));
  }, [isOpen]);

  if (!isOpen) return null;

  const save = async () => {
    const trimmed = token.trim();
    if (trimmed) await setHackMDToken(trimmed);
    else await clearHackMDToken();
    await chrome.storage.local.set({ language: locale });
    setSaved(true);
    setTimeout(onClose, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-base font-semibold text-slate-900">{t('settings.title')}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">{t('app.close')}</button>
        </div>

        <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="language-select">{t('settings.language')}</label>
        <select id="language-select" value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400">
          {SUPPORTED_LOCALES.map((candidate) => <option key={candidate} value={candidate}>{LOCALE_LABELS[candidate]}</option>)}
        </select>

        <label className="mt-4 block text-xs font-semibold text-slate-700" htmlFor="hackmd-token">{t('settings.hackmd.label')}</label>
        <input id="hackmd-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="hmd_xxxxxxxxxxxxxxxx" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400" />
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {t('settings.hackmd.help')}{' '}
          <a href="https://hackmd.io/settings#api" target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">hackmd.io/settings → API</a>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-700">{t('settings.hackmd.local')}</p>

        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t('settings.about')}</h3>
          <a href="https://ai-sister.com" target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-semibold text-sky-700 hover:underline">{t('settings.sponsored')}</a>
          <a href="mailto:TED@TED-H.com" className="mt-1 block text-xs text-slate-600 hover:text-sky-700">{t('settings.author')}</a>
          <a href="https://ted-h.com" target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-sky-700 hover:underline">https://{t('settings.website')}</a>
        </section>

        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3">
          <button type="button" onClick={() => void clearHackMDToken().then(() => setToken(''))} className="text-xs text-slate-500 hover:text-red-600">{t('settings.clear')}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">{t('settings.cancel')}</button>
            <button type="button" onClick={() => void save()} className="min-w-[64px] rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">{saved ? '✓' : t('settings.save')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeUILanguage, SupportedLang, getStoredLang } from '../../locales';

interface DashboardHeaderProps {
  userName?: string;
  onSignOut: () => void;
}

const LANG_OPTIONS: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日' },
  { code: 'ko', label: '한' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = "Guest", onSignOut }) => {
  const { t, i18n } = useTranslation('ui');
  const currentLang = (i18n.language ?? getStoredLang()) as SupportedLang;

  const handleLangChange = (lang: SupportedLang) => {
    changeUILanguage(lang);
  };

  return (
    <header className="flex justify-between items-center py-3 px-8 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div>
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Overview</p>
        <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
          {t('Dashboard')}
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-slate-600 font-medium">{userName}</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          {LANG_OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLangChange(code)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentLang === code
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut size={13} />
          {t('Logout')}
        </button>
      </div>
    </header>
  );
};

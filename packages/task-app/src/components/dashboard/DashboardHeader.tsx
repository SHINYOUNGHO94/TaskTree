import React from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeUILanguage, SupportedLang, getStoredLang } from '../../locales';

interface DashboardHeaderProps {
  userName?: string;
  onSignOut: () => void;
  onMenuOpen?: () => void;
}

const LANG_OPTIONS: { code: SupportedLang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日' },
  { code: 'ko', label: '한' },
  { code: 'zh', label: '中' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = "Guest", onSignOut, onMenuOpen }) => {
  const { t, i18n } = useTranslation('ui');
  const currentLang = (i18n.language ?? getStoredLang()) as SupportedLang;

  const handleLangChange = (lang: SupportedLang) => {
    changeUILanguage(lang);
  };

  return (
    <header className="flex justify-between items-center py-3 px-4 md:px-8 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger button — mobile only */}
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest hidden sm:block">Overview</p>
          <h1 className="text-sm md:text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
            <span className="truncate">{t('Dashboard')}</span>
            <span className="text-slate-300 font-normal flex-shrink-0">/</span>
            <span className="text-slate-600 font-medium truncate">{userName}</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Language switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
          {LANG_OPTIONS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleLangChange(code)}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
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
          className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">{t('Logout')}</span>
        </button>
      </div>
    </header>
  );
};

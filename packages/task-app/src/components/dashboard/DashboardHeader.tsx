import React from 'react';
import { LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string;
  onSignOut: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = "Guest", onSignOut }) => {
  return (
    <header className="flex justify-between items-center py-3 px-8 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div>
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest">Overview</p>
        <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
          ダッシュボード
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-slate-600 font-medium">{userName}</span>
        </h1>
      </div>

      <button
        onClick={onSignOut}
        className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <LogOut size={13} />
        ログアウト
      </button>
    </header>
  );
};

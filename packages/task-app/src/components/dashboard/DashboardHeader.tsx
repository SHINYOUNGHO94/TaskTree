import React from 'react';
import { LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string;
  onSignOut: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = "Guest", onSignOut }) => {
  return (
    <header className="flex justify-between items-center py-4 px-8 border-b border-gray-200 bg-white">
      <div>
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">概要</p>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          ダッシュボード | <span className="text-gray-700 font-medium">{userName}</span>
        </h1>
      </div>

      <button
        onClick={onSignOut}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
      >
        <LogOut size={14} />
        ログアウト
      </button>
    </header>
  );
};

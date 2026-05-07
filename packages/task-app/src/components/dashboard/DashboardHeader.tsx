import React from 'react';
import { LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  userName?: string;
  onSignOut: () => void;
}

// ダッシュボードの上部ヘッダー
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userName = "Guest", onSignOut }) => {
  return (
    <header className="max-w-7xl mx-auto flex justify-between items-center py-6 border-b border-gray-200 mb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          TaskTree <span className="text-sm font-normal text-gray-400 ml-2">Dashboard</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">Logged in as: <span className="font-medium text-gray-700">{userName}</span></p>
      </div>

      <button 
        onClick={onSignOut}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
      >
        <LogOut size={16} /> 
        Sign Out
      </button>
    </header>
  );
};

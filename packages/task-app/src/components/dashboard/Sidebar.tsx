import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ChevronRight,
  TreeDeciduous,
  Building2,
  Layers,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUser } from '../providers/UserProvider';
import { USER_ROLE_LABELS } from './caseLabels';
import { UserRole } from '@task/core';

const getMenuItems = (role?: string) => [
  { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard, href: '/dashboard' },
  ...(role === 'COMPANY_ADMIN' || role === 'DIVISION_ADMIN' || role === 'DEPT_ADMIN' || role === 'TEAM_ADMIN'
    ? [{ id: 'team', label: '組織管理', icon: Users, href: '/dashboard/team' }]
    : []),
];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

const getAvatarGradient = (name: string) => {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { profile } = useUser();

  return (
    <aside className="w-64 h-screen bg-slate-900 flex flex-col sticky top-0 shadow-xl shadow-black/20">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <TreeDeciduous className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">TaskTree</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">
          メインメニュー
        </div>
        {getMenuItems(profile?.role).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  size={16}
                  className={clsx(
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                    "transition-colors"
                  )}
                />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/50" />}
            </Link>
          );
        })}

        {/* Org Hierarchy */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">
            組織階層
          </div>
          <div className="px-3 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-slate-800 p-1.5 rounded-md flex-shrink-0">
                <Building2 size={13} className="text-slate-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none mb-1 tracking-wider">Company</p>
                <p className="text-xs font-semibold text-white truncate">{profile?.companyName || "Loading..."}</p>
                {profile?.role === 'COMPANY_ADMIN' && (
                  <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-indigo-900/50 text-indigo-300 text-[9px] font-bold rounded border border-indigo-700/30">
                    全体管理者
                  </span>
                )}
              </div>
            </div>

            {(profile?.divisionId !== 'NONE' || profile?.departmentId !== 'NONE' || profile?.teamId !== 'NONE') && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-slate-800 p-1.5 rounded-lg flex-shrink-0">
                  <Layers size={13} className="text-slate-400" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase leading-none tracking-wider">My Scope</p>
                  <div className="space-y-1.5">
                    {profile?.divisionId !== 'NONE' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">{profile?.divisionName}</p>
                        {profile?.role === 'DIVISION_ADMIN' && (
                          <span className="text-[9px] bg-indigo-900/50 text-indigo-300 px-1 rounded border border-indigo-700/30 font-bold">本部長</span>
                        )}
                      </div>
                    )}
                    {profile?.departmentId !== 'NONE' && (
                      <div className="flex items-center gap-2 pl-3 border-l border-slate-700 flex-wrap">
                        <div className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
                        <p className="text-xs font-medium text-slate-300 truncate max-w-[110px]">{profile?.departmentName}</p>
                        {profile?.role === 'DEPT_ADMIN' && (
                          <span className="text-[9px] bg-emerald-900/40 text-emerald-400 px-1 rounded border border-emerald-700/30 font-bold">部長</span>
                        )}
                      </div>
                    )}
                    {profile?.teamId !== 'NONE' && (
                      <div className="flex items-center gap-2 pl-3 border-l border-slate-700 flex-wrap">
                        <div className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0" />
                        <p className="text-xs font-medium text-slate-400 truncate max-w-[110px]">{profile?.teamName}</p>
                        {profile?.role === 'TEAM_ADMIN' && (
                          <span className="text-[9px] bg-amber-900/40 text-amber-400 px-1 rounded border border-amber-700/30 font-bold">リーダー</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700/50">
          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarGradient(profile?.name || 'G')} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {(profile?.name || "G").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{profile?.name || "Guest User"}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{profile?.role ? (USER_ROLE_LABELS[profile.role as UserRole] ?? profile.role) : "—"}</p>
          </div>
          <ChevronRight size={12} className="text-slate-500 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
};

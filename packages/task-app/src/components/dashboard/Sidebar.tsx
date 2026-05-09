import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare,
  Settings, 
  ChevronRight,
  TreeDeciduous,
  Building2,
  Layers,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUser } from '../providers/UserProvider';

// サイドバーのメニュー項目定義
const getMenuItems = (role?: string) => [
  { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard, href: '/dashboard' },
  { id: 'tasks', label: 'マイタスク', icon: CheckSquare, href: '/dashboard/tasks' },
  ...(role === 'ADMIN' ? [{ id: 'team', label: '組織管理', icon: Users, href: '/dashboard/team' }] : []),
  { id: 'settings', label: '設定', icon: Settings, href: '/dashboard/settings' },
];

// サイドバーコンポーネント
export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { profile } = useUser();

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0">
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 p-2 rounded-lg">
            <TreeDeciduous className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">TaskTree</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
          メインメニュー
        </div>
        {getMenuItems(profile?.role).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                isActive 
                  ? "bg-gray-900 text-white shadow-md shadow-gray-200" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={clsx(isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="text-white/50" />}
            </Link>
          );
        })}

        <div className="mt-10">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-4">
            組織階層
          </div>
          <div className="px-3 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg">
                <Building2 size={14} className="text-gray-600" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Company</p>
                <p className="text-xs font-bold text-gray-700">{profile?.companyName || "Loading..."}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-gray-100 p-1.5 rounded-lg">
                <Layers size={14} className="text-gray-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-1">Hierarchy</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <p className="text-xs font-medium text-gray-600">{profile?.divisionName || "---"}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <p className="text-xs font-medium text-gray-600 truncate max-w-[140px]">{profile?.departmentName || "---"}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      <p className="text-xs font-medium text-gray-600 truncate max-w-[140px]">{profile?.teamName || "---"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-50">
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">現在のユーザー</p>
          <p className="text-xs font-bold text-gray-700 truncate">{profile?.name || "Guest User"}</p>
        </div>
      </div>
    </aside>
  );
};

import { TaskSummary, TaskStatus, TaskLevel, UserRole } from '@task/core';
import { Calendar, AlertCircle, CheckCircle2, Play, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: TaskSummary;
  currentUserId?: string;
  userRole?: UserRole;
  onClick?: (id: string) => void;
  onStatusChange?: (id: string, status: TaskStatus) => void;
  onDelete?: (id: string) => void;
}

// タスクカードコンポーネント
const statusStyles: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: 'bg-gray-100 text-gray-600',
  [TaskStatus.WORKING]: 'bg-blue-50 text-blue-600 border border-blue-100',
  [TaskStatus.PAUSED]: 'bg-yellow-50 text-yellow-600 border border-yellow-100',
  [TaskStatus.COMPLETED]: 'bg-green-50 text-green-600 border border-green-100',
  [TaskStatus.CANCELLED]: 'bg-red-50 text-red-600 border border-red-100',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, currentUserId, userRole, onClick, onStatusChange, onDelete }) => {
  const isEditable = task.memberId === currentUserId || userRole === UserRole.COMPANY_ADMIN;

  return (
    <div
      className="bg-white border border-gray-200 p-5 rounded-xl hover:border-gray-300 transition-all shadow-sm group"
    >
      <div className="flex justify-between items-start mb-4">
        <span 
          onClick={() => onClick?.(task.id)}
          className={`text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer ${statusStyles[task.status]}`}
        >
          {task.status.replace('_', ' ')}
        </span>
        
        {isEditable && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {task.status !== TaskStatus.COMPLETED && (
              <button 
                onClick={(e) => { e.stopPropagation(); onStatusChange?.(task.id, TaskStatus.COMPLETED); }}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="完了"
              >
                <CheckCircle2 size={16} />
              </button>
            )}
            {task.status === TaskStatus.NOT_STARTED && (
              <button 
                onClick={(e) => { e.stopPropagation(); onStatusChange?.(task.id, TaskStatus.WORKING); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="開始"
              >
                <Play size={16} />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="削除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      <h3 
        onClick={() => onClick?.(task.id)}
        className="text-base font-bold text-gray-900 mb-6 line-clamp-2 cursor-pointer hover:text-gray-700"
      >
        {task.title}
      </h3>

      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar size={13} className="text-gray-400" />
          <span>{task.limitDate === 'NONE' ? '期限なし' : task.limitDate}</span>
        </div>
        {task.level === TaskLevel.HIGH && (
          <div className="flex items-center gap-1 text-red-500 font-bold">
            <AlertCircle size={12} />
            <span>緊急</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { TaskSummary, TaskStatus, TaskLevel } from '@task/core';
import { Calendar, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: TaskSummary;
  onClick?: (id: string) => void;
}

// タスクカード
const statusStyles: Record<TaskStatus, string> = {
  [TaskStatus.NOT_STARTED]: 'bg-gray-100 text-gray-600',
  [TaskStatus.WORKING]: 'bg-blue-100 text-blue-700',
  [TaskStatus.PAUSED]: 'bg-yellow-100 text-yellow-700',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [TaskStatus.CANCELLED]: 'bg-red-100 text-red-700',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <div
      onClick={() => onClick?.(task.id)}
      className="bg-white border border-gray-200 p-5 rounded-md hover:border-gray-400 cursor-pointer transition-all shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold px-2 py-1 rounded ${statusStyles[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
        {task.level === TaskLevel.HIGH && (
          <AlertCircle size={16} className="text-red-500" />
        )}
      </div>
      
      <h3 className="text-base font-semibold text-gray-900 mb-6 line-clamp-2">
        {task.title}
      </h3>

      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} />
          <span>{task.limitDate === 'NONE' ? 'No Deadline' : task.limitDate}</span>
        </div>
        <span className="text-gray-400">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

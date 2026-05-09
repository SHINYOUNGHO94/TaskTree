import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag } from 'lucide-react';
import { TaskLevel, TaskDetail } from '@task/core';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: TaskDetail;
  onUpdateTask: (task: TaskDetail) => Promise<void>;
}

interface FormValues {
  title: string;
  content: string;
  level: TaskLevel;
  limitDate: string;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ 
  isOpen, onClose, onSuccess, task, onUpdateTask 
}) => {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (isOpen && task) {
      reset({
        title: task.title,
        content: task.content,
        level: task.level,
        limitDate: task.limitDate
      });
    }
  }, [isOpen, task, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      const updatedTask: TaskDetail = {
        ...task,
        title: data.title,
        content: data.content,
        level: data.level,
        limitDate: data.limitDate,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateTask(updatedTask);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">タスクの編集</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">タイトル</label>
                <input 
                  {...register('title', { required: true })}
                  placeholder="タスクのタイトル"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">内容</label>
                <textarea 
                  {...register('content')}
                  placeholder="詳細内容..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none h-40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    <Flag size={12} /> 優先度
                  </label>
                  <select 
                    {...register('level')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white"
                  >
                    <option value={TaskLevel.LOW}>低</option>
                    <option value={TaskLevel.MEDIUM}>中</option>
                    <option value={TaskLevel.HIGH}>高</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    <Calendar size={12} /> 完了予定日
                  </label>
                  <input 
                    type="date"
                    {...register('limitDate')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubmitting ? "更新中..." : "変更を保存"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

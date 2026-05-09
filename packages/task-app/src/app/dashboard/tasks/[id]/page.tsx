"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Flag, 
  CheckCircle2, 
  Trash2,
  Edit3
} from "lucide-react";
import { TaskService, TaskDetail, TaskStatus, TaskLevel, UserRole } from "@task/core";
import { EditTaskModal } from "@/components/dashboard/EditTaskModal";
import { useUser } from "@/components/providers/UserProvider";

// ステータス別の表示スタイル
const statusStyles: Record<TaskStatus, { label: string; class: string }> = {
  [TaskStatus.NOT_STARTED]: { label: "未着手", class: "bg-gray-100 text-gray-600" },
  [TaskStatus.WORKING]: { label: "進行中", class: "bg-blue-100 text-blue-600" },
  [TaskStatus.PAUSED]: { label: "一時停止", class: "bg-yellow-100 text-yellow-600" },
  [TaskStatus.COMPLETED]: { label: "完了", class: "bg-green-100 text-green-600" },
  [TaskStatus.CANCELLED]: { label: "キャンセル", class: "bg-red-100 text-red-600" },
};

// 優先度別の表示スタイル
const levelStyles: Record<TaskLevel, { label: string; class: string }> = {
  [TaskLevel.LOW]: { label: "低", class: "text-blue-500" },
  [TaskLevel.MEDIUM]: { label: "中", class: "text-gray-500" },
  [TaskLevel.HIGH]: { label: "高", class: "text-red-500" },
};

const TaskDetailPage = () => {
  const { user, profile } = useUser();
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isEditable = task && user && (task.memberId === user.id || profile?.role === UserRole.COMPANY_ADMIN);

  const fetchTaskDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await TaskService.getTask(id as string);
      setTask(data);
    } catch (error) {
      console.error("Failed to fetch task detail", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTaskDetail();
    }
  }, [id, fetchTaskDetail]);

  const handleDelete = async () => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    try {
      await TaskService.deleteTask(id as string);
      router.push("/dashboard");
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900">Task not found</h2>
        <button 
          onClick={() => router.push("/dashboard")}
          className="mt-4 text-blue-600 hover:underline flex items-center gap-2 justify-center"
        >
          <ArrowLeft size={16} /> 戻る
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <button 
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          戻る
        </button>
        {isEditable && (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Edit3 size={16} />
              編集
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-red-100 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 transition-all"
            >
              <Trash2 size={16} />
              削除
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-100 bg-gray-50/30">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[task.status].class}`}>
              {statusStyles[task.status].label}
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 bg-white ${levelStyles[task.level].class}`}>
              <Flag size={12} />
              優先度: {levelStyles[task.level].label}
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 mb-6 leading-tight">
            {task.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <Calendar size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">完了予定日</p>
                <p className="text-sm font-bold text-gray-700">{task.limitDate === 'NONE' ? '期限なし' : task.limitDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <Clock size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">作成日時</p>
                <p className="text-sm font-bold text-gray-700">{new Date(task.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <CheckCircle2 size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">最終更新</p>
                <p className="text-sm font-bold text-gray-700">{new Date(task.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="prose prose-slate max-w-none">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">詳細内容</h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[200px]">
              {task.content || (
                <p className="text-gray-400 italic">空白</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditTaskModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchTaskDetail}
        task={task}
        onUpdateTask={async (updatedTask) => await TaskService.updateTask(updatedTask)}
      />
    </div>
  );
};

export default TaskDetailPage;

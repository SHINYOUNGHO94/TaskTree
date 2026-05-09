"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { TaskService, TaskSummary, TaskStatus } from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { TaskCard } from "../../components/dashboard/TaskCard";
import { CreateTaskModal } from "../../components/dashboard/CreateTaskModal";
import { EmptyTaskState } from "../../components/dashboard/EmptyTaskState";

// ダッシュボードメインページ
const DashboardPage = () => {
  const { user, profile } = useUser();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 初期データのロード
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  // タスク一覧の取得
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await TaskService.getTasks();
      // IDの重複を排除（バックエンドの不整合データ対策）
      const uniqueTasks = Array.from(new Map(data.map(item => [item.id, item])).values());
      setTasks(uniqueTasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ステータスのクイック更新
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // 現在の詳細情報を取得
      const currentTask = await TaskService.getTask(taskId);
      // ステータスのみを書き換えて更新
      await TaskService.updateTask({
        ...currentTask,
        status: newStatus
      });
      // 一覧を再取得
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Status update failed");
    }
  };

  // タスクの削除
  const handleDelete = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      await TaskService.deleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
      alert("Delete failed");
    }
  };

  // タスク詳細への遷移
  const handleTaskClick = (id: string) => {
    router.push(`/dashboard/tasks/${id}`);
  };

  if (!user) return null;

  return (
    <section>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            マイタスク
            <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">
              {tasks.length}
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">タスク管理・追跡</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={fetchTasks}
            className="p-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-all text-gray-500 shadow-sm"
            title="更新"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button 
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> 新規タスク作成
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white border border-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              currentUserId={user.id}
              userRole={profile?.role}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onClick={handleTaskClick}
            />
          ))}
        </div>
      ) : (
        <EmptyTaskState onCreateClick={() => setIsModalOpen(true)} />
      )}
      
      <CreateTaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTasks}
        onSubmitTask={async (task) => await TaskService.createTask(task)}
        memberId={user.id}
        profile={profile}
      />
    </section>
  );
};

export default DashboardPage;

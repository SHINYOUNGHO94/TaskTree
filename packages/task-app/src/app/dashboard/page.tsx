"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { AuthService, AuthUser, TaskService, TaskSummary, TaskDetail } from "@task/core";
import { TaskCard } from "../../components/dashboard/TaskCard";
import { CreateTaskModal } from "../../components/dashboard/CreateTaskModal";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";
import { EmptyTaskState } from "../../components/dashboard/EmptyTaskState";

const DashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. ユーザー認証の確認と初期データのロード
  useEffect(() => {
    const init = async () => {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);
      await fetchTasks();
    };
    init();
  }, [router]);

  // 2. タスク一覧の取得
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await TaskService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 新規タスクの作成実行
  const handleCreateTask = async (task: TaskDetail) => {
    await TaskService.createTask(task);
  };

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.push("/");
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <DashboardHeader userName={user.name} onSignOut={handleSignOut} />
      <section className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            My Tasks <span className="text-gray-400 font-normal">({tasks.length})</span>
          </h2>
          <div className="flex gap-2">
             <button 
              onClick={fetchTasks}
              className="p-2 border border-gray-200 bg-white rounded-md hover:bg-gray-50 transition-colors text-gray-500"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button 
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> New Task
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyTaskState onCreateClick={() => setIsModalOpen(true)} />
        )}
      </section>
      
      <CreateTaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTasks}
        onSubmitTask={handleCreateTask}
        memberId={user.id}
      />
    </main>
  );
};

export default DashboardPage;

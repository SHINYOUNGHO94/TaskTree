"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { CaseDetail, CaseService, TaskService, TaskSummary, TaskStatus } from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { CaseCard } from "../../components/dashboard/CaseCard";
import { TaskCard } from "../../components/dashboard/TaskCard";
import { CreateCaseModal } from "../../components/dashboard/CreateCaseModal";
import { CreateTaskModal } from "../../components/dashboard/CreateTaskModal";
import { EmptyTaskState } from "../../components/dashboard/EmptyTaskState";

const DashboardPage = () => {
  const { user, profile } = useUser();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchCases();
    }
  }, [user]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await TaskService.getTasks();
      const uniqueTasks = Array.from(new Map(data.map(item => [item.id, item])).values());
      setTasks(uniqueTasks);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCases = async () => {
    setCasesLoading(true);
    setCasesError(null);
    try {
      const data = await CaseService.getCases();
      setCases(data);
    } catch (error) {
      console.error("Failed to fetch cases", error);
      setCasesError('案件の取得に失敗しました。再度お試しください。');
    } finally {
      setCasesLoading(false);
    }
  };

  // ステータスのクイック更新
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setActionError(null);
    try {
      await TaskService.updateTask({ id: taskId, status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update status", error);
      setActionError('ステータスの更新に失敗しました。再度お試しください。');
    }
  };

  // タスクの削除
  const handleDelete = async (taskId: string) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    setActionError(null);
    try {
      await TaskService.deleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
      setActionError('タスクの削除に失敗しました。再度お試しください。');
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
            className="border border-gray-300 bg-white text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
            onClick={() => setIsCaseModalOpen(true)}
          >
            <FileText size={18} /> REQUEST 案件
          </button>
          <button
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> 新規タスク作成
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {actionError}
        </div>
      )}

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
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              案件一覧
              <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">
                {cases.length}
              </span>
            </h2>
            <p className="text-gray-500 text-sm mt-1">関連する案件</p>
          </div>
        </div>

        {casesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {casesError}
          </div>
        )}

        {casesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white border border-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : cases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c) => (
              <CaseCard key={c.caseId} caseDetail={c} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">案件はありません</p>
          </div>
        )}
      </div>

      <CreateCaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSuccess={fetchCases}
        profile={profile}
        userId={user.id}
      />
    </section>
  );
};

export default DashboardPage;

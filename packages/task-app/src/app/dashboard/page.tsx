"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, RefreshCw } from "lucide-react";
import {
  CaseDetail,
  CaseParticipantCompanyStatus,
  CaseService,
  ParticipantCompanyInvitation,
  TaskService,
  TaskSummary,
  TaskStatus,
} from "@task/core";
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
  const [invitations, setInvitations] = useState<ParticipantCompanyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [invitationActionErrors, setInvitationActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchCases();
      fetchInvitations();
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

  const fetchInvitations = async () => {
    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const data = await CaseService.getParticipantCompanyInvitations();
      setInvitations(data);
    } catch (error) {
      console.error("Failed to fetch invitations", error);
      setInvitationsError('招待の取得に失敗しました。');
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleInvitationAction = async (
    inv: ParticipantCompanyInvitation,
    status: CaseParticipantCompanyStatus.ACTIVE | CaseParticipantCompanyStatus.REJECTED,
  ) => {
    const key = `${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`;
    setProcessingInvitation(key);
    setInvitationActionErrors((prev) => ({ ...prev, [key]: "" }));
    try {
      await CaseService.updateParticipantCompanyStatus(
        inv.participantCompany.caseId,
        inv.participantCompany.companyId,
        { status },
      );
      await fetchInvitations();
    } catch (error) {
      console.error("Failed to process invitation action", error);
      setInvitationActionErrors((prev) => ({
        ...prev,
        [key]: "処理に失敗しました。再度お試しください。",
      }));
    } finally {
      setProcessingInvitation(null);
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
              <CaseCard
                key={c.caseId}
                caseDetail={c}
                onClick={(id) => router.push(`/dashboard/cases/${id}`)}
              />
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

      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">外部案件招待</h2>
            <p className="text-gray-500 text-sm mt-1">他社から受け取った案件参加招待</p>
          </div>
        </div>

        {invitationsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {invitationsError}
          </div>
        )}

        {invitationsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white border border-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-10 text-center text-gray-400 border border-gray-100 rounded-2xl bg-white">
            <p className="text-sm">外部案件の招待はありません</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {invitations.map((inv) => {
              const key = `${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`;
              const isProcessing = processingInvitation === key;
              const actionError = invitationActionErrors[key];
              return (
                <li key={key} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
                            inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED
                            ? "招待中"
                            : "参加中"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate">
                          {inv.caseSummary.caseType} / {inv.caseSummary.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">{inv.caseSummary.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        招待者: {inv.participantCompany.invitedBy}
                      </p>
                      {actionError && (
                        <p className="text-xs text-red-600 mt-1">{actionError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED && (
                        <button
                          onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          詳細を見る
                        </button>
                      )}
                      {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED && (
                        <>
                          <button
                            onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
                            disabled={isProcessing}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? "処理中..." : "承認"}
                          </button>
                          <button
                            onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.REJECTED)}
                            disabled={isProcessing}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {isProcessing ? "処理中..." : "拒否"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default DashboardPage;

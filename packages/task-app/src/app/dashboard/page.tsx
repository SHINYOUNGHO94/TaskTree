"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LayoutGrid, List, Plus, RefreshCw, Search } from "lucide-react";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseParticipantCompanyStatus,
  CaseService,
  CaseStatus,
  CaseType,
  ParticipantCompanyInvitation,
  TaskService,
  TaskSummary,
  TaskStatus,
} from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { CaseBoardView } from "../../components/dashboard/CaseBoardView";
import { CaseCard } from "../../components/dashboard/CaseCard";
import { TaskCard } from "../../components/dashboard/TaskCard";
import { CreateCaseModal } from "../../components/dashboard/CreateCaseModal";
import { CreateTaskModal } from "../../components/dashboard/CreateTaskModal";
import { EmptyTaskState } from "../../components/dashboard/EmptyTaskState";

type ViewMode = "list" | "board";
type CaseTypeFilter = "ALL" | CaseType;
type CaseStatusFilter = "ALL" | CaseStatus;
type DeliveryTypeFilter = "ALL" | CaseDeliveryType;
type OwnershipFilter = "ALL" | "CREATED_BY_ME" | "OWNED_BY_ME";
type SortKey = "updatedAt_desc" | "createdAt_desc" | "dueDate_asc" | "status" | "caseType";

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt_desc: "更新日 (新しい順)",
  createdAt_desc: "作成日 (新しい順)",
  dueDate_asc: "期限 (近い順)",
  status: "ステータス",
  caseType: "案件種別",
};

const STATUS_ORDER: Record<CaseStatus, number> = {
  [CaseStatus.IN_PROGRESS]: 0,
  [CaseStatus.REVIEW_REQUESTED]: 1,
  [CaseStatus.WAITING]: 2,
  [CaseStatus.REOPENED]: 3,
  [CaseStatus.ON_HOLD]: 4,
  [CaseStatus.COMPLETED]: 5,
  [CaseStatus.CANCELED]: 6,
};

const CASE_TYPE_ORDER: Record<CaseType, number> = {
  [CaseType.PROJECT]: 0,
  [CaseType.STANDARD]: 1,
  [CaseType.REQUEST]: 2,
};

function applyFiltersAndSort(
  cases: CaseDetail[],
  userId: string,
  query: string,
  caseTypeFilter: CaseTypeFilter,
  statusFilter: CaseStatusFilter,
  deliveryTypeFilter: DeliveryTypeFilter,
  ownershipFilter: OwnershipFilter,
  sortKey: SortKey,
): CaseDetail[] {
  const q = query.trim().toLowerCase();
  let result = cases.filter((c) => {
    if (q) {
      const match =
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.caseId.toLowerCase().includes(q) ||
        c.caseType.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (caseTypeFilter !== "ALL" && c.caseType !== caseTypeFilter) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (deliveryTypeFilter !== "ALL" && c.deliveryType !== deliveryTypeFilter) return false;
    if (ownershipFilter === "CREATED_BY_ME" && c.creatorId !== userId) return false;
    if (ownershipFilter === "OWNED_BY_ME" && c.ownerId !== userId) return false;
    return true;
  });

  result = [...result].sort((a, b) => {
    switch (sortKey) {
      case "updatedAt_desc":
        return b.updatedAt.localeCompare(a.updatedAt);
      case "createdAt_desc":
        return b.createdAt.localeCompare(a.createdAt);
      case "dueDate_asc": {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case "status":
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case "caseType":
        return CASE_TYPE_ORDER[a.caseType] - CASE_TYPE_ORDER[b.caseType];
      default:
        return 0;
    }
  });

  return result;
}

const DashboardPage = () => {
  const { user, profile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Case search / filter / sort / view state — restored from URL params when returning from detail
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseTypeFilter>(
    (searchParams.get("caseType") as CaseTypeFilter) ?? "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>(
    (searchParams.get("status") as CaseStatusFilter) ?? "ALL",
  );
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<DeliveryTypeFilter>(
    (searchParams.get("deliveryType") as DeliveryTypeFilter) ?? "ALL",
  );
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>(
    (searchParams.get("ownership") as OwnershipFilter) ?? "ALL",
  );
  const [sortKey, setSortKey] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) ?? "updatedAt_desc",
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("caseView") as ViewMode) ?? "list",
  );

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
      setCasesError("案件の取得に失敗しました。再度お試しください。");
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
      setInvitationsError("招待の取得に失敗しました。");
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

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setActionError(null);
    try {
      await TaskService.updateTask({ id: taskId, status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update status", error);
      setActionError("ステータスの更新に失敗しました。再度お試しください。");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("このタスクを削除しますか？")) return;
    setActionError(null);
    try {
      await TaskService.deleteTask(taskId);
      await fetchTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
      setActionError("タスクの削除に失敗しました。再度お試しください。");
    }
  };

  const handleTaskClick = (id: string) => {
    router.push(`/dashboard/tasks/${id}`);
  };

  const handleCaseClick = (caseId: string) => {
    const params = new URLSearchParams({
      caseView: viewMode,
      caseType: caseTypeFilter,
      status: statusFilter,
      deliveryType: deliveryTypeFilter,
      ownership: ownershipFilter,
      sort: sortKey,
      q: searchQuery,
    });
    router.push(`/dashboard/cases/${caseId}?${params.toString()}`);
  };

  const filteredCases = useMemo(
    () =>
      applyFiltersAndSort(
        cases,
        user?.id ?? "",
        searchQuery,
        caseTypeFilter,
        statusFilter,
        deliveryTypeFilter,
        ownershipFilter,
        sortKey,
      ),
    [cases, user?.id, searchQuery, caseTypeFilter, statusFilter, deliveryTypeFilter, ownershipFilter, sortKey],
  );

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

      {/* Case section */}
      <div className="mt-12">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              案件一覧
              <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">
                {filteredCases.length}
                {filteredCases.length !== cases.length && (
                  <span className="ml-1 text-gray-400">/ {cases.length}</span>
                )}
              </span>
            </h2>
            <p className="text-gray-500 text-sm mt-1">関連する案件</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg border transition-colors ${viewMode === "list" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
              title="リスト表示"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-2 rounded-lg border transition-colors ${viewMode === "board" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
              title="ボード表示"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Search / Filter / Sort controls */}
        <div className="bg-gray-50/60 border border-gray-200/80 p-3 rounded-2xl flex flex-wrap gap-3 mb-6 items-center shadow-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="タイトル・説明・ID で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-gray-200/80 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all shadow-sm"
            />
          </div>

          <select
            value={caseTypeFilter}
            onChange={(e) => setCaseTypeFilter(e.target.value as CaseTypeFilter)}
            className="text-sm border border-gray-200/80 rounded-xl px-3.5 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all cursor-pointer"
          >
            <option value="ALL">種別: すべて</option>
            <option value={CaseType.REQUEST}>REQUEST</option>
            <option value={CaseType.STANDARD}>STANDARD</option>
            <option value={CaseType.PROJECT}>PROJECT</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatusFilter)}
            className="text-sm border border-gray-200/80 rounded-xl px-3.5 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all cursor-pointer"
          >
            <option value="ALL">状態: すべて</option>
            <option value={CaseStatus.WAITING}>待機中</option>
            <option value={CaseStatus.IN_PROGRESS}>対応中</option>
            <option value={CaseStatus.REVIEW_REQUESTED}>レビュー依頼</option>
            <option value={CaseStatus.COMPLETED}>完了</option>
            <option value={CaseStatus.ON_HOLD}>保留</option>
            <option value={CaseStatus.CANCELED}>キャンセル</option>
            <option value={CaseStatus.REOPENED}>再開</option>
          </select>

          <select
            value={deliveryTypeFilter}
            onChange={(e) => setDeliveryTypeFilter(e.target.value as DeliveryTypeFilter)}
            className="text-sm border border-gray-200/80 rounded-xl px-3.5 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all cursor-pointer"
          >
            <option value="ALL">配信: すべて</option>
            <option value={CaseDeliveryType.DIRECT}>直接依頼</option>
            <option value={CaseDeliveryType.OPEN}>公開</option>
          </select>

          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
            className="text-sm border border-gray-200/80 rounded-xl px-3.5 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all cursor-pointer"
          >
            <option value="ALL">担当: すべて</option>
            <option value="CREATED_BY_ME">自分が作成</option>
            <option value="OWNED_BY_ME">自分が担当</option>
          </select>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-gray-200/80 rounded-xl px-3.5 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        {casesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between gap-4">
            <span>{casesError}</span>
            <button
              onClick={fetchCases}
              className="text-xs font-bold underline text-red-600 hover:text-red-800 shrink-0"
            >
              再試行
            </button>
          </div>
        )}

        {casesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full bg-white border border-gray-200/60 p-5 rounded-xl animate-pulse flex flex-col justify-between min-h-[170px] shadow-sm">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded mb-2.5" />
                  <div className="space-y-1.5 mb-4">
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-5/6 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 w-full mt-auto">
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-3 w-14 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-gray-50/30 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6">
            <FileText size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">案件はありません</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-gray-50/30 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6">
            <Search size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">条件に一致する案件がありません</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setCaseTypeFilter("ALL");
                setStatusFilter("ALL");
                setDeliveryTypeFilter("ALL");
                setOwnershipFilter("ALL");
              }}
              className="mt-4 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all text-xs font-bold"
            >
              フィルターをリセット
            </button>
          </div>
        ) : viewMode === "board" ? (
          <CaseBoardView cases={filteredCases} onCaseClick={handleCaseClick} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
              <CaseCard key={c.caseId} caseDetail={c} onClick={handleCaseClick} />
            ))}
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

      {/* External invitations section */}
      {/* External invitations section */}
      <div className="mt-12 bg-gray-50/30 border border-gray-200/60 p-6 rounded-2xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">外部案件招待</h2>
            <p className="text-gray-500 text-sm mt-1">他社から受け取った案件参加招待</p>
          </div>
        </div>

        {invitationsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between gap-4">
            <span>{invitationsError}</span>
            <button
              onClick={fetchInvitations}
              className="text-xs font-bold underline text-red-600 hover:text-red-800 shrink-0"
            >
              再試行
            </button>
          </div>
        )}

        {invitationsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white border border-gray-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-10 text-center text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-white">
            <p className="text-sm">外部案件の招待はありません</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {invitations.map((inv) => {
              const key = `${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`;
              const isProcessing = processingInvitation === key;
              const invActionError = invitationActionErrors[key];
              return (
                <li key={key} className="bg-white border border-gray-200/80 hover:border-gray-300 transition-all rounded-xl p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap border ${
                            inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}
                        >
                          {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED
                            ? "招待中"
                            : "参加中"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wide px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">
                          {inv.caseSummary.caseType} / {inv.caseSummary.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate mb-1">{inv.caseSummary.title}</p>
                      <p className="text-xs text-gray-400">
                        招待者: <span className="font-semibold text-gray-600">{inv.participantCompany.invitedBy}</span>
                      </p>
                      {invActionError && (
                        <p className="text-xs text-red-600 mt-1.5 font-medium">{invActionError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED && (
                        <button
                          onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
                          className="text-xs font-bold px-3.5 py-2 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
                        >
                          詳細を見る
                        </button>
                      )}
                      {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED && (
                        <>
                          <button
                            onClick={() =>
                              handleInvitationAction(inv, CaseParticipantCompanyStatus.ACTIVE)
                            }
                            disabled={isProcessing}
                            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
                          >
                            {isProcessing ? "処理中..." : "承認"}
                          </button>
                          <button
                            onClick={() =>
                              handleInvitationAction(inv, CaseParticipantCompanyStatus.REJECTED)
                            }
                            disabled={isProcessing}
                            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
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

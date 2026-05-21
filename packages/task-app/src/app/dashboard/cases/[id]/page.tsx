"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, FileText, Shield, Tag, User } from "lucide-react";
import {
  CaseComment,
  CaseDeliveryType,
  CaseDetail,
  CaseHistoryAction,
  CaseHistoryEntry,
  CaseOwnerType,
  CaseService,
  CaseStatus,
  CaseTargetScope,
  CaseTaskDetail,
  CaseTaskStatus,
  CaseType,
  UserRole,
} from "@task/core";

const HISTORY_ACTION_LABELS: Record<CaseHistoryAction, string> = {
  [CaseHistoryAction.CASE_CREATED]: "案件作成",
  [CaseHistoryAction.STATUS_CHANGED]: "ステータス変更",
  [CaseHistoryAction.TASK_CREATED]: "作業追加",
};

const TASK_STATUS_LABELS: Record<CaseTaskStatus, string> = {
  [CaseTaskStatus.TODO]: "未対応",
  [CaseTaskStatus.IN_PROGRESS]: "対応中",
  [CaseTaskStatus.REVIEW_REQUESTED]: "レビュー依頼",
  [CaseTaskStatus.DONE]: "完了",
  [CaseTaskStatus.ON_HOLD]: "保留",
  [CaseTaskStatus.CANCELED]: "キャンセル",
};

const TASK_STATUS_STYLES: Record<CaseTaskStatus, string> = {
  [CaseTaskStatus.TODO]: "bg-gray-100 text-gray-600",
  [CaseTaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-600",
  [CaseTaskStatus.REVIEW_REQUESTED]: "bg-purple-100 text-purple-600",
  [CaseTaskStatus.DONE]: "bg-green-100 text-green-600",
  [CaseTaskStatus.ON_HOLD]: "bg-yellow-100 text-yellow-600",
  [CaseTaskStatus.CANCELED]: "bg-red-100 text-red-600",
};

type ErrorType = "notFound" | "forbidden" | "error";

const UPDATABLE_STATUSES: CaseStatus[] = [
  CaseStatus.WAITING,
  CaseStatus.IN_PROGRESS,
  CaseStatus.REVIEW_REQUESTED,
  CaseStatus.COMPLETED,
  CaseStatus.ON_HOLD,
  CaseStatus.CANCELED,
  CaseStatus.REOPENED,
];

const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: "待機中",
  [CaseStatus.IN_PROGRESS]: "対応中",
  [CaseStatus.REVIEW_REQUESTED]: "レビュー依頼",
  [CaseStatus.COMPLETED]: "完了",
  [CaseStatus.ON_HOLD]: "保留",
  [CaseStatus.CANCELED]: "キャンセル",
  [CaseStatus.REOPENED]: "再開",
};

const STATUS_STYLES: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: "bg-gray-100 text-gray-600",
  [CaseStatus.IN_PROGRESS]: "bg-blue-100 text-blue-600",
  [CaseStatus.REVIEW_REQUESTED]: "bg-purple-100 text-purple-600",
  [CaseStatus.COMPLETED]: "bg-green-100 text-green-600",
  [CaseStatus.ON_HOLD]: "bg-yellow-100 text-yellow-600",
  [CaseStatus.CANCELED]: "bg-red-100 text-red-600",
  [CaseStatus.REOPENED]: "bg-orange-100 text-orange-600",
};

const CASE_TYPE_STYLES: Record<CaseType, string> = {
  [CaseType.REQUEST]: "bg-orange-50 text-orange-600 border border-orange-100",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-600 border border-blue-100",
  [CaseType.PROJECT]: "bg-purple-50 text-purple-600 border border-purple-100",
};

const DELIVERY_TYPE_LABELS: Record<CaseDeliveryType, string> = {
  [CaseDeliveryType.DIRECT]: "直接依頼",
  [CaseDeliveryType.OPEN]: "公開",
};

const TARGET_SCOPE_LABELS: Record<CaseTargetScope, string> = {
  [CaseTargetScope.COMPANY]: "会社",
  [CaseTargetScope.DIVISION]: "事業部",
  [CaseTargetScope.DEPARTMENT]: "部署",
  [CaseTargetScope.TEAM]: "チーム",
  [CaseTargetScope.USER]: "個人",
};

const OWNER_TYPE_LABELS: Record<CaseOwnerType, string> = {
  [CaseOwnerType.USER]: "個人",
  [CaseOwnerType.TEAM]: "チーム",
  [CaseOwnerType.DEPARTMENT]: "部署",
  [CaseOwnerType.DIVISION]: "事業部",
  [CaseOwnerType.COMPANY]: "会社",
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.GUEST]: "ゲスト",
  [UserRole.USER]: "ユーザー",
  [UserRole.TEAM_ADMIN]: "チームリーダー",
  [UserRole.DEPT_ADMIN]: "部長",
  [UserRole.DIVISION_ADMIN]: "事業部長",
  [UserRole.COMPANY_ADMIN]: "社長",
};

const resolveErrorType = (error: unknown): ErrorType => {
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.response === "object" && e.response !== null) {
      const r = e.response as Record<string, unknown>;
      if (r.statusCode === 404) return "notFound";
      if (r.statusCode === 403) return "forbidden";
    }
    if (typeof e.message === "string") {
      if (e.message.includes("404")) return "notFound";
      if (e.message.includes("403")) return "forbidden";
    }
  }
  return "error";
};

const CaseDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [caseTasks, setCaseTasks] = useState<CaseTaskDetail[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreateError, setTaskCreateError] = useState<string | null>(null);
  const [caseHistory, setCaseHistory] = useState<CaseHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [caseComments, setCaseComments] = useState<CaseComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    setIsLoading(true);
    setErrorType(null);
    try {
      const data = await CaseService.getCase(id as string);
      setCaseDetail(data);
      setSelectedStatus(data.status);
    } catch (error) {
      console.error("Failed to fetch case detail", error);
      setErrorType(resolveErrorType(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !caseDetail || selectedStatus === caseDetail.status) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await CaseService.updateCaseStatus(id as string, { status: selectedStatus });
      await Promise.all([fetchCase(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to update case status", error);
      setUpdateError("ステータスの更新に失敗しました。再度お試しください。");
      setSelectedStatus(caseDetail.status);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchCaseTasks = useCallback(async () => {
    setIsTasksLoading(true);
    setTasksError(null);
    try {
      const data = await CaseService.getCaseTasks(id as string);
      setCaseTasks(data);
    } catch (error) {
      console.error("Failed to fetch case tasks", error);
      setTasksError("作業の取得に失敗しました。");
    } finally {
      setIsTasksLoading(false);
    }
  }, [id]);

  const fetchCaseHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await CaseService.getCaseHistory(id as string);
      setCaseHistory(data);
    } catch (error) {
      console.error("Failed to fetch case history", error);
      setHistoryError("履歴の取得に失敗しました。");
    } finally {
      setIsHistoryLoading(false);
    }
  }, [id]);

  const fetchCaseComments = useCallback(async () => {
    setIsCommentsLoading(true);
    setCommentsError(null);
    try {
      const data = await CaseService.getCaseComments(id as string);
      setCaseComments(data);
    } catch (error) {
      console.error("Failed to fetch case comments", error);
      setCommentsError("コメントの取得に失敗しました。");
    } finally {
      setIsCommentsLoading(false);
    }
  }, [id]);

  const handleSubmitComment = async () => {
    if (!newCommentContent.trim()) {
      setCommentSubmitError("コメント内容を入力してください。");
      return;
    }
    setIsSubmittingComment(true);
    setCommentSubmitError(null);
    try {
      await CaseService.createCaseComment(id as string, { content: newCommentContent.trim() });
      setNewCommentContent("");
      await fetchCaseComments();
    } catch (error) {
      console.error("Failed to submit comment", error);
      setCommentSubmitError("コメントの送信に失敗しました。再度お試しください。");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setTaskCreateError("タイトルを入力してください。");
      return;
    }
    setIsCreatingTask(true);
    setTaskCreateError(null);
    try {
      await CaseService.createCaseTask(id as string, {
        title: newTaskTitle.trim(),
        description: newTaskDescription,
        dueDate: newTaskDueDate || null,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setShowTaskForm(false);
      await Promise.all([fetchCaseTasks(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to create case task", error);
      setTaskCreateError("作業の作成に失敗しました。再度お試しください。");
    } finally {
      setIsCreatingTask(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCase();
      fetchCaseTasks();
      fetchCaseHistory();
      fetchCaseComments();
    }
  }, [id, fetchCase, fetchCaseTasks, fetchCaseHistory, fetchCaseComments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (errorType) {
    const errorConfig = {
      notFound: {
        title: "案件が見つかりません",
        message: "この案件は存在しないか、すでに削除されています。",
      },
      forbidden: {
        title: "アクセス権限がありません",
        message: "この案件を閲覧する権限がありません。",
      },
      error: {
        title: "エラーが発生しました",
        message: "案件の取得に失敗しました。再度お試しください。",
      },
    }[errorType];

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium mb-8"
        >
          <ArrowLeft size={18} />
          戻る
        </button>
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{errorConfig.title}</h2>
          <p className="text-gray-500 text-sm">{errorConfig.message}</p>
        </div>
      </div>
    );
  }

  if (!caseDetail) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          戻る
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-8 border-b border-gray-100 bg-gray-50/30">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[caseDetail.status]}`}>
              {STATUS_LABELS[caseDetail.status]}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${CASE_TYPE_STYLES[caseDetail.caseType]}`}>
              {caseDetail.caseType}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
              {DELIVERY_TYPE_LABELS[caseDetail.deliveryType]}
            </span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-6 leading-tight">
            {caseDetail.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={selectedStatus ?? caseDetail.status}
              onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
              disabled={isUpdating}
              className="text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {UPDATABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={isUpdating || selectedStatus === caseDetail.status}
              className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? "更新中..." : "ステータス更新"}
            </button>
            {updateError && (
              <p className="text-sm text-red-600 font-medium">{updateError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <Calendar size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">期限</p>
                <p className="text-sm font-bold text-gray-700">{caseDetail.dueDate ?? "期限なし"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <Clock size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">作成日時</p>
                <p className="text-sm font-bold text-gray-700">
                  {new Date(caseDetail.createdAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                <Clock size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">最終更新</p>
                <p className="text-sm font-bold text-gray-700">
                  {new Date(caseDetail.updatedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">詳細内容</h3>
          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[120px]">
            {caseDetail.description || (
              <span className="text-gray-400 italic">内容なし</span>
            )}
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">案件情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                <Tag size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">公開範囲</p>
                <p className="text-sm font-bold text-gray-700">
                  {TARGET_SCOPE_LABELS[caseDetail.targetScope]}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{caseDetail.targetScopeId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                <Shield size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">最低権限</p>
                <p className="text-sm font-bold text-gray-700">
                  {ROLE_LABELS[caseDetail.requiredRole]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                <User size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">担当</p>
                <p className="text-sm font-bold text-gray-700">
                  {OWNER_TYPE_LABELS[caseDetail.ownerType]}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{caseDetail.ownerId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                <User size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">作成者</p>
                <p className="text-xs text-gray-400 font-mono">{caseDetail.creatorId}</p>
              </div>
            </div>

            {caseDetail.projectId && (
              <div className="flex items-start gap-3">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                  <FileText size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">プロジェクト</p>
                  <p className="text-xs text-gray-400 font-mono">{caseDetail.projectId}</p>
                </div>
              </div>
            )}

            {caseDetail.parentCaseId && (
              <div className="flex items-start gap-3">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mt-0.5">
                  <FileText size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">親案件</p>
                  <p className="text-xs text-gray-400 font-mono">{caseDetail.parentCaseId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">作業一覧</h3>
          <button
            onClick={() => {
              setShowTaskForm(!showTaskForm);
              setTaskCreateError(null);
            }}
            className="text-sm font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            {showTaskForm ? "キャンセル" : "+ 作業を追加"}
          </button>
        </div>

        {showTaskForm && (
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="space-y-4">
              {taskCreateError && (
                <p className="text-sm text-red-600 font-medium">{taskCreateError}</p>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  タイトル
                </label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="作業のタイトルを入力"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  内容（任意）
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="作業の詳細を入力..."
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  期限（任意）
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingTask ? "作成中..." : "作業を作成"}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {isTasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : tasksError ? (
            <p className="text-sm text-red-600 text-center py-6">{tasksError}</p>
          ) : caseTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">作業はまだありません。</p>
          ) : (
            <ul className="space-y-3">
              {caseTasks.map((task) => (
                <li
                  key={task.taskId}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${TASK_STATUS_STYLES[task.status]}`}
                  >
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  <span className="text-sm font-bold text-gray-800 flex-1 truncate">
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {task.dueDate}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">コメント</h3>
        </div>

        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="space-y-3">
            {commentSubmitError && (
              <p className="text-sm text-red-600 font-medium">{commentSubmitError}</p>
            )}
            <textarea
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="コメントを入力..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleSubmitComment}
              disabled={isSubmittingComment || !newCommentContent.trim()}
              className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmittingComment ? "送信中..." : "コメントを送信"}
            </button>
          </div>
        </div>

        <div className="p-6">
          {isCommentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : commentsError ? (
            <p className="text-sm text-red-600 text-center py-6">{commentsError}</p>
          ) : caseComments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">コメントはまだありません。</p>
          ) : (
            <ul className="space-y-4">
              {caseComments.map((comment) => (
                <li key={comment.commentId} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 font-mono">{comment.authorId}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mt-6">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">履歴</h3>
        </div>
        <div className="p-6">
          {isHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : historyError ? (
            <p className="text-sm text-red-600 text-center py-6">{historyError}</p>
          ) : caseHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">履歴はまだありません。</p>
          ) : (
            <ul className="space-y-2">
              {caseHistory.map((entry) => (
                <li
                  key={entry.historyId}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">
                    {new Date(entry.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                    {HISTORY_ACTION_LABELS[entry.action]}
                  </span>
                  <span className="text-xs text-gray-500 flex-1">{entry.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;

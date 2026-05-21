"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, FileText, Shield, Tag, User } from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  CaseClaimRequest,
  CaseClaimRequestStatus,
  CaseComment,
  CaseDeliveryType,
  CaseDetail,
  CaseHistoryAction,
  CaseHistoryEntry,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseParticipantCompanyStatus,
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
  [CaseHistoryAction.CLAIM_REQUESTED]: "担当希望",
  [CaseHistoryAction.CLAIM_APPROVED]: "担当承認",
  [CaseHistoryAction.CLAIM_REJECTED]: "担当却下",
  [CaseHistoryAction.CHILD_CASE_CREATED]: "子案件追加",
  [CaseHistoryAction.PARTICIPANT_COMPANY_INVITED]: "外部会社招待",
  [CaseHistoryAction.PARTICIPANT_COMPANY_ACCEPTED]: "外部会社参加承認",
  [CaseHistoryAction.PARTICIPANT_COMPANY_REJECTED]: "外部会社参加拒否",
};

const PARTICIPANT_STATUS_STYLES: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "bg-yellow-100 text-yellow-700",
  [CaseParticipantCompanyStatus.ACTIVE]: "bg-green-100 text-green-700",
  [CaseParticipantCompanyStatus.REJECTED]: "bg-red-100 text-red-700",
  [CaseParticipantCompanyStatus.REMOVED]: "bg-gray-100 text-gray-500",
};

const PARTICIPANT_STATUS_LABELS: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "招待中",
  [CaseParticipantCompanyStatus.ACTIVE]: "参加中",
  [CaseParticipantCompanyStatus.REJECTED]: "拒否",
  [CaseParticipantCompanyStatus.REMOVED]: "削除",
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claimRequests, setClaimRequests] = useState<CaseClaimRequest[]>([]);
  const [isClaimsLoading, setIsClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [claimsAccessDenied, setClaimsAccessDenied] = useState(false);
  const [claimMessage, setClaimMessage] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSubmitError, setClaimSubmitError] = useState<string | null>(null);
  const [isProcessingClaimAction, setIsProcessingClaimAction] = useState(false);
  const [claimActionError, setClaimActionError] = useState<string | null>(null);
  const [childCases, setChildCases] = useState<CaseDetail[]>([]);
  const [isChildCasesLoading, setIsChildCasesLoading] = useState(false);
  const [childCasesError, setChildCasesError] = useState<string | null>(null);
  const [showChildCaseForm, setShowChildCaseForm] = useState(false);
  const [childCaseTitle, setChildCaseTitle] = useState("");
  const [childCaseDescription, setChildCaseDescription] = useState("");
  const [childCaseDeliveryType, setChildCaseDeliveryType] = useState<CaseDeliveryType>(CaseDeliveryType.DIRECT);
  const [childCaseTargetScope, setChildCaseTargetScope] = useState<CaseTargetScope>(CaseTargetScope.TEAM);
  const [childCaseTargetScopeId, setChildCaseTargetScopeId] = useState("");
  const [childCaseRequiredRole, setChildCaseRequiredRole] = useState<UserRole>(UserRole.USER);
  const [childCaseDueDate, setChildCaseDueDate] = useState("");
  const [isCreatingChildCase, setIsCreatingChildCase] = useState(false);
  const [childCaseCreateError, setChildCaseCreateError] = useState<string | null>(null);
  const [requestChildrenByStandard, setRequestChildrenByStandard] = useState<Record<string, CaseDetail[]>>({});
  const [isNestedLoading, setIsNestedLoading] = useState(false);
  const [nestedChildCasesError, setNestedChildCasesError] = useState<string | null>(null);
  const [participantCompanies, setParticipantCompanies] = useState<CaseParticipantCompany[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  const fetchCaseClaimRequests = useCallback(async () => {
    setIsClaimsLoading(true);
    setClaimsError(null);
    setClaimsAccessDenied(false);
    try {
      const data = await CaseService.getCaseClaimRequests(id as string);
      setClaimRequests(data);
    } catch (error) {
      const e = error as Record<string, unknown>;
      const statusCode =
        typeof e.response === "object" && e.response !== null
          ? (e.response as Record<string, unknown>).statusCode
          : null;
      if (statusCode === 403) {
        setClaimsAccessDenied(true);
      } else {
        setClaimsError("担当希望の取得に失敗しました。");
      }
    } finally {
      setIsClaimsLoading(false);
    }
  }, [id]);

  const handleSubmitClaim = async () => {
    setIsSubmittingClaim(true);
    setClaimSubmitError(null);
    try {
      await CaseService.createCaseClaimRequest(id as string, {
        ...(claimMessage.trim() ? { message: claimMessage.trim() } : {}),
      });
      setClaimMessage("");
      await Promise.all([fetchCase(), fetchCaseClaimRequests(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to submit claim request", error);
      setClaimSubmitError("担当希望の送信に失敗しました。再度お試しください。");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleClaimAction = async (
    claimRequestId: string,
    action: "APPROVED" | "REJECTED",
    rejectReason?: string,
  ) => {
    setIsProcessingClaimAction(true);
    setClaimActionError(null);
    try {
      await CaseService.updateCaseClaimRequest(id as string, claimRequestId, {
        status: action === "APPROVED" ? CaseClaimRequestStatus.APPROVED : CaseClaimRequestStatus.REJECTED,
        ...(rejectReason ? { rejectReason } : {}),
      });
      await Promise.all([fetchCase(), fetchCaseClaimRequests(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to process claim action", error);
      setClaimActionError("処理に失敗しました。再度お試しください。");
    } finally {
      setIsProcessingClaimAction(false);
    }
  };

  const fetchChildCases = useCallback(async () => {
    setIsChildCasesLoading(true);
    setChildCasesError(null);
    setNestedChildCasesError(null);
    try {
      const data = await CaseService.getChildCases(id as string);
      setChildCases(data);
    } catch (error) {
      console.error("Failed to fetch child cases", error);
      setChildCasesError("子案件の取得に失敗しました。");
    } finally {
      setIsChildCasesLoading(false);
    }
  }, [id]);

  const fetchNestedRequestChildren = useCallback(async (standardChildren: CaseDetail[]) => {
    if (standardChildren.length === 0) {
      setRequestChildrenByStandard({});
      setNestedChildCasesError(null);
      return;
    }

    setIsNestedLoading(true);
    setNestedChildCasesError(null);
    try {
      const results = await Promise.allSettled(
        standardChildren.map(async (standardChild) => {
          const requests = await CaseService.getChildCases(standardChild.caseId);
          return [standardChild.caseId, requests] as [string, CaseDetail[]];
        }),
      );
      const entries = results
        .filter((result): result is PromiseFulfilledResult<[string, CaseDetail[]]> => result.status === "fulfilled")
        .map((result) => result.value);
      setRequestChildrenByStandard(Object.fromEntries(entries));
      if (results.some((result) => result.status === "rejected")) {
        setNestedChildCasesError("Some REQUEST child cases could not be loaded.");
      }
    } finally {
      setIsNestedLoading(false);
    }
  }, []);

  const handleCreateChildCase = async () => {
    if (!childCaseTitle.trim()) {
      setChildCaseCreateError("タイトルを入力してください。");
      return;
    }
    if (!childCaseDescription.trim()) {
      setChildCaseCreateError("内容を入力してください。");
      return;
    }
    if (!childCaseTargetScopeId.trim()) {
      setChildCaseCreateError("送信先IDを入力してください。");
      return;
    }
    setIsCreatingChildCase(true);
    setChildCaseCreateError(null);
    try {
      await CaseService.createChildCase(id as string, {
        title: childCaseTitle.trim(),
        description: childCaseDescription.trim(),
        deliveryType: childCaseDeliveryType,
        targetScope: childCaseTargetScope,
        targetScopeId: childCaseTargetScopeId.trim(),
        requiredRole: childCaseRequiredRole,
        dueDate: childCaseDueDate || null,
      });
      setChildCaseTitle("");
      setChildCaseDescription("");
      setChildCaseTargetScopeId("");
      setChildCaseDueDate("");
      setShowChildCaseForm(false);
      await Promise.all([fetchChildCases(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to create child case", error);
      setChildCaseCreateError("子案件の作成に失敗しました。再度お試しください。");
    } finally {
      setIsCreatingChildCase(false);
    }
  };

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

  const fetchParticipantCompanies = useCallback(async () => {
    setIsParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const data = await CaseService.getParticipantCompanies(id as string);
      setParticipantCompanies(data);
    } catch (error) {
      console.error("Failed to fetch participant companies", error);
      setParticipantsError("参加会社の取得に失敗しました。");
    } finally {
      setIsParticipantsLoading(false);
    }
  }, [id]);

  const handleInviteCompany = async () => {
    if (!inviteCompanyId.trim()) {
      setInviteError("会社IDを入力してください。");
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    try {
      await CaseService.inviteParticipantCompany(id as string, { companyId: inviteCompanyId.trim() });
      setInviteCompanyId("");
      setShowInviteForm(false);
      await Promise.all([fetchParticipantCompanies(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to invite company", error);
      setInviteError("招待に失敗しました。会社IDを確認してください。");
    } finally {
      setIsInviting(false);
    }
  };

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
    fetchAuthSession()
      .then(({ tokens }) => {
        const sub = tokens?.idToken?.payload?.sub;
        if (typeof sub === "string") setCurrentUserId(sub);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (id) {
      fetchCase();
      fetchCaseTasks();
      fetchCaseHistory();
      fetchCaseComments();
      fetchCaseClaimRequests();
      fetchChildCases();
      fetchParticipantCompanies();
    }
  }, [id, fetchCase, fetchCaseTasks, fetchCaseHistory, fetchCaseComments, fetchCaseClaimRequests, fetchChildCases, fetchParticipantCompanies]);

  useEffect(() => {
    if (!caseDetail || caseDetail.caseId !== id) return;
    if (caseDetail.caseType !== CaseType.PROJECT) {
      setRequestChildrenByStandard({});
      setNestedChildCasesError(null);
      setIsNestedLoading(false);
      return;
    }

    void fetchNestedRequestChildren(childCases);
  }, [id, caseDetail, childCases, fetchNestedRequestChildren]);

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
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">子案件</h3>
          {(caseDetail.caseType === CaseType.STANDARD ||
            caseDetail.caseType === CaseType.PROJECT) &&
            currentUserId &&
            (caseDetail.creatorId === currentUserId ||
              (caseDetail.ownerType === CaseOwnerType.USER &&
                caseDetail.ownerId === currentUserId)) && (
              <button
                onClick={() => {
                  setShowChildCaseForm(!showChildCaseForm);
                  setChildCaseCreateError(null);
                }}
                className="text-sm font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                {showChildCaseForm
                  ? "キャンセル"
                  : caseDetail.caseType === CaseType.PROJECT
                    ? "+ STANDARD を追加"
                    : "+ 子案件を追加"}
              </button>
            )}
        </div>

        {showChildCaseForm && (
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="space-y-4">
              {childCaseCreateError && (
                <p className="text-sm text-red-600 font-medium">{childCaseCreateError}</p>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">タイトル</label>
                <input
                  value={childCaseTitle}
                  onChange={(e) => setChildCaseTitle(e.target.value)}
                  placeholder="子案件のタイトルを入力"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">内容</label>
                <textarea
                  value={childCaseDescription}
                  onChange={(e) => setChildCaseDescription(e.target.value)}
                  placeholder="子案件の詳細を入力..."
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">配信タイプ</label>
                  <select
                    value={childCaseDeliveryType}
                    onChange={(e) => setChildCaseDeliveryType(e.target.value as CaseDeliveryType)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={CaseDeliveryType.DIRECT}>直接依頼</option>
                    <option value={CaseDeliveryType.OPEN}>公開</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">送信先</label>
                  <select
                    value={childCaseTargetScope}
                    onChange={(e) => setChildCaseTargetScope(e.target.value as CaseTargetScope)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={CaseTargetScope.TEAM}>チーム</option>
                    <option value={CaseTargetScope.USER}>個人</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {childCaseTargetScope === CaseTargetScope.TEAM ? "チームID" : "ユーザーID"}
                </label>
                <input
                  value={childCaseTargetScopeId}
                  onChange={(e) => setChildCaseTargetScopeId(e.target.value)}
                  placeholder={childCaseTargetScope === CaseTargetScope.TEAM ? "チームIDを入力" : "ユーザーIDを入力"}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">最低権限</label>
                  <select
                    value={childCaseRequiredRole}
                    onChange={(e) => setChildCaseRequiredRole(e.target.value as UserRole)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={UserRole.USER}>ユーザー</option>
                    <option value={UserRole.TEAM_ADMIN}>チームリーダー</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">期限（任意）</label>
                  <input
                    type="date"
                    value={childCaseDueDate}
                    onChange={(e) => setChildCaseDueDate(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateChildCase}
                disabled={isCreatingChildCase}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingChildCase ? "作成中..." : "子案件を作成"}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {isChildCasesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : childCasesError ? (
            <p className="text-sm text-red-600 text-center py-6">{childCasesError}</p>
          ) : childCases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">子案件はまだありません。</p>
          ) : caseDetail.caseType === CaseType.PROJECT ? (
            <>
              {nestedChildCasesError && (
                <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  {nestedChildCasesError}
                </p>
              )}
              <ul className="space-y-4">
              {childCases.map((standardChild) => (
                <li key={standardChild.caseId} className="border border-blue-100 rounded-xl overflow-hidden">
                  <div
                    onClick={() => router.push(`/dashboard/cases/${standardChild.caseId}`)}
                    className="flex items-center gap-3 p-3 bg-blue-50/40 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_STYLES[standardChild.status]}`}>
                      {STATUS_LABELS[standardChild.status]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100">
                      STANDARD
                    </span>
                    <span className="text-sm font-bold text-gray-800 flex-1 truncate">{standardChild.title}</span>
                    {standardChild.dueDate && (
                      <span className="text-xs text-gray-400 whitespace-nowrap">{standardChild.dueDate}</span>
                    )}
                  </div>
                  {isNestedLoading ? (
                    <div className="px-6 py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                    </div>
                  ) : (requestChildrenByStandard[standardChild.caseId] ?? []).length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                      {(requestChildrenByStandard[standardChild.caseId] ?? []).map((requestChild) => (
                        <li
                          key={requestChild.caseId}
                          onClick={() => router.push(`/dashboard/cases/${requestChild.caseId}`)}
                          className="flex items-center gap-3 p-3 pl-8 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <span className="text-gray-300 text-xs">{"└"}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_STYLES[requestChild.status]}`}>
                            {STATUS_LABELS[requestChild.status]}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-orange-50 text-orange-600 border border-orange-100">
                            REQUEST
                          </span>
                          <span className="text-sm text-gray-700 flex-1 truncate">{requestChild.title}</span>
                          {requestChild.dueDate && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">{requestChild.dueDate}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              </ul>
            </>
          ) : (
            <ul className="space-y-3">
              {childCases.map((child) => (
                <li
                  key={child.caseId}
                  onClick={() => router.push(`/dashboard/cases/${child.caseId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_STYLES[child.status]}`}>
                    {STATUS_LABELS[child.status]}
                  </span>
                  <span className="text-sm font-bold text-gray-800 flex-1 truncate">{child.title}</span>
                  {child.dueDate && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">{child.dueDate}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mt-6">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">参加会社</h3>
            {currentUserId &&
              (caseDetail.creatorId === currentUserId ||
                (caseDetail.ownerType === CaseOwnerType.USER &&
                  caseDetail.ownerId === currentUserId)) && (
                <button
                  onClick={() => setShowInviteForm((v) => !v)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {showInviteForm ? "キャンセル" : "会社を招待"}
                </button>
              )}
          </div>
          {showInviteForm && (
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="space-y-3">
                {inviteError && (
                  <p className="text-sm text-red-600 font-medium">{inviteError}</p>
                )}
                <input
                  type="text"
                  value={inviteCompanyId}
                  onChange={(e) => setInviteCompanyId(e.target.value)}
                  placeholder="招待する会社のID..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleInviteCompany}
                  disabled={isInviting || !inviteCompanyId.trim()}
                  className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isInviting ? "招待中..." : "招待する"}
                </button>
              </div>
            </div>
          )}
          <div className="p-6">
            {isParticipantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
              </div>
            ) : participantsError ? (
              <p className="text-sm text-red-600 text-center py-4">{participantsError}</p>
            ) : participantCompanies.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">参加会社はまだありません。</p>
            ) : (
              <ul className="space-y-3">
                {participantCompanies.map((p) => (
                  <li key={p.companyId} className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{p.companyName ?? p.companyId}</span>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{p.companyId}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PARTICIPANT_STATUS_STYLES[p.status]}`}>
                      {PARTICIPANT_STATUS_LABELS[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mt-6">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">担当希望</h3>
          </div>
          <div className="p-6">
            {isClaimsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
              </div>
            ) : claimsError ? (
              <p className="text-sm text-red-600 text-center py-4">{claimsError}</p>
            ) : (
              <>
                {claimActionError && (
                  <p className="text-sm text-red-600 font-medium mb-4">{claimActionError}</p>
                )}
                {claimRequests.length > 0 && (
                  <ul className="space-y-3 mb-6">
                    {claimRequests.map((req) => (
                      <li
                        key={req.claimRequestId}
                        className="border border-gray-100 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-mono">{req.requesterId}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              req.status === CaseClaimRequestStatus.PENDING
                                ? "bg-yellow-100 text-yellow-700"
                                : req.status === CaseClaimRequestStatus.APPROVED
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {req.status === CaseClaimRequestStatus.PENDING
                              ? "申請中"
                              : req.status === CaseClaimRequestStatus.APPROVED
                                ? "承認済"
                                : "却下"}
                          </span>
                        </div>
                        {req.message && (
                          <p className="text-sm text-gray-700 mb-2">{req.message}</p>
                        )}
                        {req.rejectReason && (
                          <p className="text-xs text-red-500 mb-2">却下理由: {req.rejectReason}</p>
                        )}
                        {req.status === CaseClaimRequestStatus.PENDING &&
                          currentUserId &&
                          (caseDetail.creatorId === currentUserId ||
                            (caseDetail.ownerType === CaseOwnerType.USER &&
                              caseDetail.ownerId === currentUserId)) && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleClaimAction(req.claimRequestId, "APPROVED")}
                                disabled={isProcessingClaimAction}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => {
                                  const reason = window.prompt("却下理由を入力してください");
                                  if (reason && reason.trim()) {
                                    void handleClaimAction(req.claimRequestId, "REJECTED", reason.trim());
                                  }
                                }}
                                disabled={isProcessingClaimAction}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                却下
                              </button>
                            </div>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
                {currentUserId &&
                  caseDetail.creatorId !== currentUserId &&
                  !(
                    caseDetail.ownerType === CaseOwnerType.USER &&
                    caseDetail.ownerId === currentUserId
                  ) &&
                  (claimsAccessDenied ||
                    !claimRequests.some(
                      (r) =>
                        r.requesterId === currentUserId &&
                        r.status === CaseClaimRequestStatus.PENDING,
                    )) && (
                    <div className="space-y-3">
                      {claimSubmitError && (
                        <p className="text-sm text-red-600 font-medium">{claimSubmitError}</p>
                      )}
                      <textarea
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        placeholder="担当したい理由（任意）..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <button
                        onClick={handleSubmitClaim}
                        disabled={isSubmittingClaim}
                        className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmittingClaim ? "送信中..." : "担当を希望する"}
                      </button>
                    </div>
                  )}
                {claimRequests.length === 0 && !claimsAccessDenied && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    担当希望はまだありません。
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

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

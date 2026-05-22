"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Shield,
  Tag,
  User,
  AlertCircle,
  CheckSquare,
  Square,
  CornerDownRight,
} from "lucide-react";
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
  [CaseParticipantCompanyStatus.INVITED]: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  [CaseParticipantCompanyStatus.ACTIVE]: "bg-green-50 text-green-700 border border-green-200",
  [CaseParticipantCompanyStatus.REJECTED]: "bg-red-50 text-red-700 border border-red-200",
  [CaseParticipantCompanyStatus.REMOVED]: "bg-gray-50 text-gray-500 border border-gray-200",
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
  [CaseTaskStatus.TODO]: "bg-gray-100 text-gray-600 border border-gray-200",
  [CaseTaskStatus.IN_PROGRESS]: "bg-blue-50 text-blue-600 border border-blue-100",
  [CaseTaskStatus.REVIEW_REQUESTED]: "bg-purple-50 text-purple-600 border border-purple-100",
  [CaseTaskStatus.DONE]: "bg-green-50 text-green-600 border border-green-100",
  [CaseTaskStatus.ON_HOLD]: "bg-yellow-50 text-yellow-600 border border-yellow-100",
  [CaseTaskStatus.CANCELED]: "bg-red-50 text-red-600 border border-red-100",
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
  [CaseStatus.WAITING]: "bg-gray-100 text-gray-700 border border-gray-200",
  [CaseStatus.IN_PROGRESS]: "bg-blue-50 text-blue-700 border border-blue-100",
  [CaseStatus.REVIEW_REQUESTED]: "bg-purple-50 text-purple-700 border border-purple-100",
  [CaseStatus.COMPLETED]: "bg-green-50 text-green-700 border border-green-100",
  [CaseStatus.ON_HOLD]: "bg-yellow-50 text-yellow-700 border border-yellow-100",
  [CaseStatus.CANCELED]: "bg-red-50 text-red-700 border border-red-100",
  [CaseStatus.REOPENED]: "bg-orange-50 text-orange-700 border border-orange-100",
};

const CASE_TYPE_STYLES: Record<CaseType, string> = {
  [CaseType.REQUEST]: "bg-orange-50 text-orange-700 border border-orange-100",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-700 border border-blue-100",
  [CaseType.PROJECT]: "bg-purple-50 text-purple-700 border border-purple-100",
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

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

const CaseDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    const caseView = searchParams.get("caseView");
    const caseType = searchParams.get("caseType");
    const status = searchParams.get("status");
    const deliveryType = searchParams.get("deliveryType");
    const ownership = searchParams.get("ownership");
    const sort = searchParams.get("sort");
    const q = searchParams.get("q");
    if (caseView) params.set("caseView", caseView);
    if (caseType) params.set("caseType", caseType);
    if (status) params.set("status", status);
    if (deliveryType) params.set("deliveryType", deliveryType);
    if (ownership) params.set("ownership", ownership);
    if (sort) params.set("sort", sort);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  };
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
        setNestedChildCasesError("一部の REQUEST 子案件をロードできませんでした。");
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push(buildBackUrl())}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium mb-8"
        >
          <ArrowLeft size={18} />
          戻る
        </button>
        <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <FileText size={48} className="mx-auto mb-4 text-gray-300 animate-pulse" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{errorConfig.title}</h2>
          <p className="text-gray-500 text-sm">{errorConfig.message}</p>
        </div>
      </div>
    );
  }

  if (!caseDetail) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.push(buildBackUrl())}
          className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          戻る
        </button>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Main Contents (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Case Info Card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-8">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[caseDetail.status]}`}>
                  {STATUS_LABELS[caseDetail.status]}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${CASE_TYPE_STYLES[caseDetail.caseType]}`}>
                  {caseDetail.caseType}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200">
                  {DELIVERY_TYPE_LABELS[caseDetail.deliveryType]}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-950 mb-6 leading-tight">
                {caseDetail.title}
              </h1>

              {/* Description Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">詳細内容</h3>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                  {caseDetail.description || (
                    <span className="text-gray-400 italic">内容なし</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Child Cases (STANDARD / REQUEST hierarchy) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">子案件</h3>
                <p className="text-xs text-gray-400 mt-0.5">関連するサブ案件の階層構造</p>
              </div>
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
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
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
                  {childCaseCreateError && <ErrorAlert message={childCaseCreateError} />}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">タイトル</label>
                    <input
                      value={childCaseTitle}
                      onChange={(e) => setChildCaseTitle(e.target.value)}
                      placeholder="子案件のタイトルを入力"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">内容</label>
                    <textarea
                      value={childCaseDescription}
                      onChange={(e) => setChildCaseDescription(e.target.value)}
                      placeholder="子案件の詳細を入力..."
                      rows={3}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">配信タイプ</label>
                      <select
                        value={childCaseDeliveryType}
                        onChange={(e) => setChildCaseDeliveryType(e.target.value as CaseDeliveryType)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
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
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
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
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">最低権限</label>
                      <select
                        value={childCaseRequiredRole}
                        onChange={(e) => setChildCaseRequiredRole(e.target.value as UserRole)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
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
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
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
                <ErrorAlert message={childCasesError} />
              ) : childCases.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">子案件はまだありません。</p>
                </div>
              ) : caseDetail.caseType === CaseType.PROJECT ? (
                <>
                  {nestedChildCasesError && <ErrorAlert message={nestedChildCasesError} />}
                  <ul className="space-y-4">
                    {childCases.map((standardChild) => (
                      <li key={standardChild.caseId} className="border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                        <div
                          onClick={() => router.push(`/dashboard/cases/${standardChild.caseId}`)}
                          className="flex items-center gap-3 p-4 bg-blue-50/20 hover:bg-blue-50/50 transition-colors cursor-pointer"
                        >
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[standardChild.status]}`}>
                            {STATUS_LABELS[standardChild.status]}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-blue-100 text-blue-700 border border-blue-200">
                            STANDARD
                          </span>
                          <span className="text-sm font-bold text-gray-800 flex-1 truncate">{standardChild.title}</span>
                          {standardChild.dueDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar size={12} />
                              {standardChild.dueDate}
                            </span>
                          )}
                        </div>
                        {isNestedLoading ? (
                          <div className="px-6 py-4 flex items-center gap-2 border-t border-gray-50">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                            <span className="text-xs text-gray-400">ロード中...</span>
                          </div>
                        ) : (requestChildrenByStandard[standardChild.caseId] ?? []).length > 0 ? (
                          <ul className="divide-y divide-gray-50 border-t border-gray-50 bg-gray-50/30">
                            {(requestChildrenByStandard[standardChild.caseId] ?? []).map((requestChild) => (
                              <li
                                key={requestChild.caseId}
                                onClick={() => router.push(`/dashboard/cases/${requestChild.caseId}`)}
                                className="flex items-center gap-3 p-3 pl-8 hover:bg-gray-50 transition-colors cursor-pointer group"
                              >
                                <CornerDownRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[requestChild.status]}`}>
                                  {STATUS_LABELS[requestChild.status]}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200">
                                  REQUEST
                                </span>
                                <span className="text-sm text-gray-700 flex-1 truncate">{requestChild.title}</span>
                                {requestChild.dueDate && (
                                  <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                                    <Calendar size={12} />
                                    {requestChild.dueDate}
                                  </span>
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
                <ul className="space-y-2.5">
                  {childCases.map((child) => (
                    <li
                      key={child.caseId}
                      onClick={() => router.push(`/dashboard/cases/${child.caseId}`)}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer shadow-sm"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[child.status]}`}>
                        {STATUS_LABELS[child.status]}
                      </span>
                      <span className="text-sm font-bold text-gray-800 flex-1 truncate">{child.title}</span>
                      {child.dueDate && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} />
                          {child.dueDate}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Work / Tasks Checklist */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">作業一覧</h3>
                <p className="text-xs text-gray-400 mt-0.5">完了すべきタスクのチェックリスト</p>
              </div>
              <button
                onClick={() => {
                  setShowTaskForm(!showTaskForm);
                  setTaskCreateError(null);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                {showTaskForm ? "キャンセル" : "+ 作業を追加"}
              </button>
            </div>

            {showTaskForm && (
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="space-y-4">
                  {taskCreateError && <ErrorAlert message={taskCreateError} />}
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">タイトル</label>
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="作業のタイトルを入力"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">内容（任意）</label>
                    <textarea
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="作業の詳細を入力..."
                      rows={3}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">期限（任意）</label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
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
                <ErrorAlert message={tasksError} />
              ) : caseTasks.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">作業はまだありません。</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {caseTasks.map((task) => {
                    const isCompleted = task.status === CaseTaskStatus.DONE;
                    return (
                      <li
                        key={task.taskId}
                        className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all shadow-sm"
                      >
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-green-500" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold text-gray-800 truncate ${isCompleted ? "line-through text-gray-400 font-normal" : ""}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${TASK_STATUS_STYLES[task.status]}`}>
                            {TASK_STATUS_LABELS[task.status]}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar size={12} />
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">コメント</h3>
              <p className="text-xs text-gray-400 mt-0.5">案件に関するディスカッション</p>
            </div>

            {/* Comment Input Card */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
              <div className="space-y-3">
                {commentSubmitError && <ErrorAlert message={commentSubmitError} />}
                <textarea
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="コメントを入力..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none bg-white"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitComment}
                    disabled={isSubmittingComment || !newCommentContent.trim()}
                    className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingComment ? "送信中..." : "コメントを送信"}
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="p-6">
              {isCommentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : commentsError ? (
                <ErrorAlert message={commentsError} />
              ) : caseComments.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">コメントはまだありません。</p>
                </div>
              ) : (
                <ul className="space-y-5">
                  {caseComments.map((comment) => (
                    <li key={comment.commentId} className="flex items-start gap-3.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm">
                        <User size={16} />
                      </div>
                      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700 font-mono">{comment.authorId}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(comment.createdAt).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Sidebar (1/3 width) */}
        <div className="space-y-6">
          
          {/* Status Update Panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4">ステータス更新</h3>
            <div className="space-y-3">
              <select
                value={selectedStatus ?? caseDetail.status}
                onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                disabled={isUpdating}
                className="w-full text-sm font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 transition-all"
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
                className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "更新中..." : "ステータス更新"}
              </button>
              {updateError && <ErrorAlert message={updateError} />}
            </div>
          </div>

          {/* Details & Specs Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4.5">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">案件仕様</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">期限</span>
                  <span className="text-sm font-semibold text-gray-700">{caseDetail.dueDate ?? "期限なし"}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">作成日時</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {new Date(caseDetail.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">最終更新</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {new Date(caseDetail.updatedAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">公開範囲</span>
                  <span className="text-sm font-semibold text-gray-700">{TARGET_SCOPE_LABELS[caseDetail.targetScope]}</span>
                  <span className="text-[10px] text-gray-400 block font-mono mt-0.5 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 max-w-[180px] truncate" title={caseDetail.targetScopeId}>
                    {caseDetail.targetScopeId}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">最低権限</span>
                  <span className="text-sm font-semibold text-gray-700">{ROLE_LABELS[caseDetail.requiredRole]}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">担当</span>
                  <span className="text-sm font-semibold text-gray-700">{OWNER_TYPE_LABELS[caseDetail.ownerType]}</span>
                  <span className="text-[10px] text-gray-400 block font-mono mt-0.5 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 max-w-[180px] truncate" title={caseDetail.ownerId}>
                    {caseDetail.ownerId}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">作成者</span>
                  <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block max-w-[180px] truncate mt-0.5" title={caseDetail.creatorId}>
                    {caseDetail.creatorId}
                  </span>
                </div>
              </div>

              {caseDetail.projectId && (
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">プロジェクト</span>
                    <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block max-w-[180px] truncate mt-0.5" title={caseDetail.projectId}>
                      {caseDetail.projectId}
                    </span>
                  </div>
                </div>
              )}

              {caseDetail.parentCaseId && (
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">親案件</span>
                    <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 block max-w-[180px] truncate mt-0.5" title={caseDetail.parentCaseId}>
                      {caseDetail.parentCaseId}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participant Companies List (Conditional on OPEN delivery) */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-gray-800">参加会社</h3>
                {currentUserId &&
                  (caseDetail.creatorId === currentUserId ||
                    (caseDetail.ownerType === CaseOwnerType.USER &&
                      caseDetail.ownerId === currentUserId)) && (
                    <button
                      onClick={() => setShowInviteForm((v) => !v)}
                      className="text-[10px] font-bold px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {showInviteForm ? "キャンセル" : "招待"}
                    </button>
                  )}
              </div>

              {showInviteForm && (
                <div className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-2.5 animate-fadeIn">
                  {inviteError && <ErrorAlert message={inviteError} />}
                  <input
                    type="text"
                    value={inviteCompanyId}
                    onChange={(e) => setInviteCompanyId(e.target.value)}
                    placeholder="招待する会社のID..."
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                  <button
                    onClick={handleInviteCompany}
                    disabled={isInviting || !inviteCompanyId.trim()}
                    className="w-full text-xs font-bold py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isInviting ? "招待中..." : "招待する"}
                  </button>
                </div>
              )}

              {isParticipantsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                </div>
              ) : participantsError ? (
                <ErrorAlert message={participantsError} />
              ) : participantCompanies.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">参加会社はまだありません。</p>
              ) : (
                <ul className="space-y-2">
                  {participantCompanies.map((p) => (
                    <li key={p.companyId} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 bg-gray-50/20">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-800 block truncate">{p.companyName ?? p.companyId}</span>
                        <span className="text-[9px] text-gray-400 font-mono block truncate">{p.companyId}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${PARTICIPANT_STATUS_STYLES[p.status]}`}>
                        {PARTICIPANT_STATUS_LABELS[p.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Claims (Conditional on OPEN delivery) */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">担当希望</h3>
              
              {isClaimsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                </div>
              ) : claimsError ? (
                <ErrorAlert message={claimsError} />
              ) : (
                <div className="space-y-4">
                  {claimActionError && <ErrorAlert message={claimActionError} />}
                  
                  {claimRequests.length > 0 && (
                    <ul className="space-y-3.5">
                      {claimRequests.map((req) => (
                        <li key={req.claimRequestId} className="border border-gray-150 rounded-xl p-3 bg-gray-50/20 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]" title={req.requesterId}>
                              {req.requesterId}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                req.status === CaseClaimRequestStatus.PENDING
                                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                  : req.status === CaseClaimRequestStatus.APPROVED
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
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
                            <p className="text-xs text-gray-700 bg-white p-2 rounded-lg border border-gray-100 mb-2 leading-relaxed">{req.message}</p>
                          )}
                          {req.rejectReason && (
                            <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 mb-2">却下理由: {req.rejectReason}</p>
                          )}
                          {req.status === CaseClaimRequestStatus.PENDING &&
                            currentUserId &&
                            (caseDetail.creatorId === currentUserId ||
                              (caseDetail.ownerType === CaseOwnerType.USER &&
                                caseDetail.ownerId === currentUserId)) && (
                              <div className="flex gap-2 mt-3 justify-end">
                                <button
                                  onClick={() => handleClaimAction(req.claimRequestId, "APPROVED")}
                                  disabled={isProcessingClaimAction}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  却下
                                </button>
                              </div>
                            )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Submission Form */}
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
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        {claimSubmitError && <ErrorAlert message={claimSubmitError} />}
                        <textarea
                          value={claimMessage}
                          onChange={(e) => setClaimMessage(e.target.value)}
                          placeholder="担当したい理由（任意）..."
                          rows={2.5}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                        />
                        <button
                          onClick={handleSubmitClaim}
                          disabled={isSubmittingClaim}
                          className="w-full text-xs font-bold py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmittingClaim ? "送信中..." : "担当を希望する"}
                        </button>
                      </div>
                    )}

                  {claimRequests.length === 0 && !claimsAccessDenied && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      担当希望はまだありません。
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline History Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">履歴</h3>
            
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
              </div>
            ) : historyError ? (
              <ErrorAlert message={historyError} />
            ) : caseHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">履歴はまだありません。</p>
            ) : (
              <ul className="relative pl-3.5 border-l-2 border-gray-100 space-y-4 my-2">
                {caseHistory.map((entry) => (
                  <li key={entry.historyId} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute left-[-20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50/50" />
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {new Date(entry.createdAt).toLocaleString("ja-JP")}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {HISTORY_ACTION_LABELS[entry.action]}
                      </span>
                      <p className="text-[11px] text-gray-500 leading-normal">{entry.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;

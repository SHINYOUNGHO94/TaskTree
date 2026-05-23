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
} from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  CaseClaimRequest,
  CaseClaimRequestStatus,
  CaseComment,
  CaseDeliveryType,
  CaseDetail,
  CaseHistoryEntry,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseService,
  CaseStatus,
  CaseTargetScope,
  CaseTaskDetail,
  CaseType,
  UserProfile,
  UserRole,
  UserService,
} from "@task/core";
import {
  CASE_DELIVERY_TYPE_LABELS,
  CASE_STATUS_LABELS,
  CASE_TARGET_SCOPE_LABELS,
  CASE_TYPE_LABELS,
  USER_ROLE_LABELS,
  resolveDisplayName,
  shortId,
} from "../../../../components/dashboard/caseLabels";
import { CaseChildCasesSection } from "../../../../components/case-detail/CaseChildCasesSection";
import { CaseTasksSection } from "../../../../components/case-detail/CaseTasksSection";
import { CaseHistorySection } from "../../../../components/case-detail/CaseHistorySection";
import { CaseCommentsSection } from "../../../../components/case-detail/CaseCommentsSection";
import { CaseParticipantCompanySection } from "../../../../components/case-detail/CaseParticipantCompanySection";

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

const STATUS_STYLES: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]:           "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80",
  [CaseStatus.IN_PROGRESS]:       "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  [CaseStatus.REVIEW_REQUESTED]:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80",
  [CaseStatus.COMPLETED]:         "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
  [CaseStatus.ON_HOLD]:           "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
  [CaseStatus.CANCELED]:          "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80",
  [CaseStatus.REOPENED]:          "bg-orange-50 text-orange-700 ring-1 ring-orange-200/80",
};

const CASE_TYPE_STYLES: Record<CaseType, string> = {
  [CaseType.REQUEST]:  "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80",
  [CaseType.PROJECT]:  "bg-violet-50 text-violet-700 ring-1 ring-violet-200/80",
};

const CASE_TYPE_GRADIENT: Record<CaseType, string> = {
  [CaseType.REQUEST]:  "from-amber-400 to-orange-500",
  [CaseType.STANDARD]: "from-blue-400 to-sky-500",
  [CaseType.PROJECT]:  "from-violet-500 to-purple-600",
};

const OWNER_TYPE_LABELS: Record<CaseOwnerType, string> = {
  [CaseOwnerType.USER]:       "個人",
  [CaseOwnerType.TEAM]:       "チーム",
  [CaseOwnerType.DEPARTMENT]: "部署",
  [CaseOwnerType.DIVISION]:   "事業部",
  [CaseOwnerType.COMPANY]:    "会社",
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
    const caseView    = searchParams.get("caseView");
    const caseType    = searchParams.get("caseType");
    const status      = searchParams.get("status");
    const deliveryType = searchParams.get("deliveryType");
    const ownership   = searchParams.get("ownership");
    const sort        = searchParams.get("sort");
    const q           = searchParams.get("q");
    if (caseView)     params.set("caseView", caseView);
    if (caseType)     params.set("caseType", caseType);
    if (status)       params.set("status", status);
    if (deliveryType) params.set("deliveryType", deliveryType);
    if (ownership)    params.set("ownership", ownership);
    if (sort)         params.set("sort", sort);
    if (q)            params.set("q", q);
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
  const [caseHistory, setCaseHistory] = useState<CaseHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [caseComments, setCaseComments] = useState<CaseComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
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
  const [requestChildrenByStandard, setRequestChildrenByStandard] = useState<Record<string, CaseDetail[]>>({});
  const [isNestedLoading, setIsNestedLoading] = useState(false);
  const [nestedChildCasesError, setNestedChildCasesError] = useState<string | null>(null);
  const [participantCompanies, setParticipantCompanies] = useState<CaseParticipantCompany[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Map<string, { name: string; email: string }>>(new Map());

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

  const fetchCompanyUsers = useCallback(async () => {
    try {
      const users = await UserService.getCompanyUsers();
      const map = new Map(users.map((u) => [u.userId, { name: u.name, email: u.email }]));
      setUserMap(map);
    } catch {
      // display name resolution is best-effort
    }
  }, []);

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
        setNestedChildCasesError("一部の依頼子案件をロードできませんでした。");
      }
    } finally {
      setIsNestedLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchAuthSession()
      .then(({ tokens }) => {
        const sub = tokens?.idToken?.payload?.sub;
        if (typeof sub === "string") setCurrentUserId(sub);
      })
      .catch(() => undefined);
    UserService.getUserProfile().then(setCurrentProfile).catch(() => undefined);
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
      fetchCompanyUsers();
    }
  }, [id, fetchCase, fetchCaseTasks, fetchCaseHistory, fetchCaseComments, fetchCaseClaimRequests, fetchChildCases, fetchParticipantCompanies, fetchCompanyUsers]);

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
      <div className="animate-pulse">
        <div className="h-6 w-16 bg-slate-200 rounded-lg mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-md shadow-slate-100/60">
              <div className="h-1.5 bg-slate-200" />
              <div className="p-8 space-y-5">
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                </div>
                <div className="h-8 bg-slate-200 rounded-xl w-3/4" />
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                  <div className="h-3 bg-slate-100 rounded w-4/6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 h-40 shadow-sm" />
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
              <div className="h-4 bg-slate-200 rounded-lg w-24" />
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
              <div className="h-4 bg-slate-200 rounded-lg w-16 mb-2" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 bg-slate-100 rounded w-12" />
                    <div className="h-3.5 bg-slate-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorType) {
    const errorConfig = {
      notFound: { title: "案件が見つかりません", message: "この案件は存在しないか、すでに削除されています。" },
      forbidden: { title: "アクセス権限がありません", message: "この案件を閲覧する権限がありません。" },
      error: { title: "エラーが発生しました", message: "案件の取得に失敗しました。再度お試しください。" },
    }[errorType];

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(buildBackUrl())}
          className="group flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-all text-sm font-medium mb-8"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          戻る
        </button>
        <div className="text-center py-24 bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/50">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{errorConfig.title}</h2>
          <p className="text-slate-400 text-sm">{errorConfig.message}</p>
        </div>
      </div>
    );
  }

  if (!caseDetail) return null;

  return (
    <div>
      {/* Back button */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.push(buildBackUrl())}
          className="group flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-all duration-200 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          戻る
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main case info card */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className={`h-1.5 w-full bg-gradient-to-r ${CASE_TYPE_GRADIENT[caseDetail.caseType]}`} />
            <div className="p-8">
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[caseDetail.status]}`}>
                  {CASE_STATUS_LABELS[caseDetail.status]}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${CASE_TYPE_STYLES[caseDetail.caseType]}`}>
                  {CASE_TYPE_LABELS[caseDetail.caseType]}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">
                  {CASE_DELIVERY_TYPE_LABELS[caseDetail.deliveryType]}
                </span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-6 leading-tight">
                {caseDetail.title}
              </h1>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">詳細内容</h3>
                <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap min-h-[100px] bg-slate-50/60 rounded-xl p-4 border border-slate-100">
                  {caseDetail.description || (
                    <span className="text-slate-300 italic">内容なし</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <CaseChildCasesSection
            caseDetail={caseDetail}
            currentUserId={currentUserId}
            currentProfile={currentProfile}
            childCases={childCases}
            isChildCasesLoading={isChildCasesLoading}
            childCasesError={childCasesError}
            requestChildrenByStandard={requestChildrenByStandard}
            nestedChildCasesError={nestedChildCasesError}
            isNestedLoading={isNestedLoading}
            onCreated={async () => { await Promise.all([fetchChildCases(), fetchCaseHistory()]); }}
            onNavigate={(caseId) => router.push(`/dashboard/cases/${caseId}`)}
          />

          <CaseTasksSection
            caseId={id as string}
            caseDetail={caseDetail}
            caseTasks={caseTasks}
            isTasksLoading={isTasksLoading}
            tasksError={tasksError}
            currentUserId={currentUserId}
            currentProfile={currentProfile}
            userMap={userMap}
            onTaskChange={async () => { await Promise.all([fetchCaseTasks(), fetchCaseHistory()]); }}
          />

          <CaseCommentsSection
            caseId={id as string}
            comments={caseComments}
            isLoading={isCommentsLoading}
            error={commentsError}
            userMap={userMap}
            onRefresh={fetchCaseComments}
          />
        </div>

        {/* Right: sidebar panels */}
        <div className="space-y-6">

          {/* Status update */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-lg shadow-slate-200/50">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Clock size={12} className="text-indigo-500" />
              </div>
              ステータス更新
            </h3>
            <div className="space-y-3">
              <select
                value={selectedStatus ?? caseDetail.status}
                onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                disabled={isUpdating}
                className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-50 transition-all cursor-pointer hover:border-slate-300"
              >
                {UPDATABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating || selectedStatus === caseDetail.status}
                className="w-full text-sm font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200/60 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200 shadow-md shadow-indigo-300/20"
              >
                {isUpdating ? "更新中..." : "ステータス更新"}
              </button>
              {updateError && <ErrorAlert message={updateError} />}
            </div>
          </div>

          {/* Details & specs */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-lg shadow-slate-200/50">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 mb-5">案件仕様</h3>
            <div className="space-y-4">

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">期限</span>
                  <span className="text-sm font-semibold text-slate-700">{caseDetail.dueDate ?? "期限なし"}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">作成日時</span>
                  <span className="text-sm font-semibold text-slate-700">{new Date(caseDetail.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">最終更新</span>
                  <span className="text-sm font-semibold text-slate-700">{new Date(caseDetail.updatedAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Tag size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">公開範囲</span>
                  <span className="text-sm font-semibold text-slate-700">{CASE_TARGET_SCOPE_LABELS[caseDetail.targetScope]}</span>
                  <span className="text-xs text-slate-500 block mt-0.5 max-w-[180px] truncate" title={caseDetail.targetScope === CaseTargetScope.USER ? resolveDisplayName(caseDetail.targetScopeId, userMap) : shortId(caseDetail.targetScopeId)}>
                    {caseDetail.targetScope === CaseTargetScope.USER ? resolveDisplayName(caseDetail.targetScopeId, userMap) : shortId(caseDetail.targetScopeId)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">最低権限</span>
                  <span className="text-sm font-semibold text-slate-700">{USER_ROLE_LABELS[caseDetail.requiredRole]}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">担当</span>
                  <span className="text-sm font-semibold text-slate-700">{OWNER_TYPE_LABELS[caseDetail.ownerType]}</span>
                  <span className="text-xs text-slate-500 block mt-0.5 max-w-[180px] truncate" title={caseDetail.ownerType === CaseOwnerType.USER ? resolveDisplayName(caseDetail.ownerId, userMap) : shortId(caseDetail.ownerId)}>
                    {caseDetail.ownerType === CaseOwnerType.USER ? resolveDisplayName(caseDetail.ownerId, userMap) : shortId(caseDetail.ownerId)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={13} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">作成者</span>
                  <span className="text-xs text-slate-500 block max-w-[180px] truncate mt-0.5" title={resolveDisplayName(caseDetail.creatorId, userMap)}>
                    {resolveDisplayName(caseDetail.creatorId, userMap)}
                  </span>
                </div>
              </div>

              {caseDetail.projectId && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={13} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">プロジェクト</span>
                    <span className="text-xs text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 block max-w-[180px] truncate mt-0.5" title={caseDetail.projectId}>
                      {caseDetail.projectId}
                    </span>
                  </div>
                </div>
              )}

              {caseDetail.parentCaseId && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={13} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">親案件</span>
                    <span className="text-xs text-slate-500 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 block max-w-[180px] truncate mt-0.5" title={caseDetail.parentCaseId}>
                      {caseDetail.parentCaseId}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participant companies */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
            <CaseParticipantCompanySection
              caseId={id as string}
              caseDetail={caseDetail}
              participantCompanies={participantCompanies}
              isParticipantsLoading={isParticipantsLoading}
              participantsError={participantsError}
              currentUserId={currentUserId}
              onRefresh={async () => { await Promise.all([fetchParticipantCompanies(), fetchCaseHistory()]); }}
            />
          )}

          {/* Claims */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-lg shadow-slate-200/50">
              <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4">担当希望</h3>

              {isClaimsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                </div>
              ) : claimsError ? (
                <ErrorAlert message={claimsError} />
              ) : (
                <div className="space-y-4">
                  {claimActionError && <ErrorAlert message={claimActionError} />}

                  {claimRequests.length > 0 && (
                    <ul className="space-y-3">
                      {claimRequests.map((req) => (
                        <li key={req.claimRequestId} className="border border-slate-100 rounded-xl p-3 bg-slate-50/40">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-600 font-semibold truncate max-w-[120px]" title={resolveDisplayName(req.requesterId, userMap)}>
                              {resolveDisplayName(req.requesterId, userMap)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              req.status === CaseClaimRequestStatus.PENDING
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80"
                                : req.status === CaseClaimRequestStatus.APPROVED
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                                  : "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80"
                            }`}>
                              {req.status === CaseClaimRequestStatus.PENDING ? "申請中" : req.status === CaseClaimRequestStatus.APPROVED ? "承認済" : "却下"}
                            </span>
                          </div>
                          {req.message && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-100 mb-2 leading-relaxed">{req.message}</p>
                          )}
                          {req.rejectReason && (
                            <p className="text-[10px] text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 mb-2">却下理由: {req.rejectReason}</p>
                          )}
                          {req.status === CaseClaimRequestStatus.PENDING &&
                            currentUserId &&
                            (caseDetail.creatorId === currentUserId ||
                              (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId)) && (
                              <div className="flex gap-2 mt-3 justify-end">
                                <button
                                  onClick={() => handleClaimAction(req.claimRequestId, "APPROVED")}
                                  disabled={isProcessingClaimAction}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    !(caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId) &&
                    (claimsAccessDenied || !claimRequests.some((r) => r.requesterId === currentUserId && r.status === CaseClaimRequestStatus.PENDING)) && (
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        {claimSubmitError && <ErrorAlert message={claimSubmitError} />}
                        <textarea
                          value={claimMessage}
                          onChange={(e) => setClaimMessage(e.target.value)}
                          placeholder="担当したい理由（任意）..."
                          rows={2}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition-all"
                        />
                        <button
                          onClick={handleSubmitClaim}
                          disabled={isSubmittingClaim}
                          className="w-full text-xs font-bold py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200 shadow-md shadow-indigo-300/20"
                        >
                          {isSubmittingClaim ? "送信中..." : "担当を希望する"}
                        </button>
                      </div>
                    )}

                  {claimRequests.length === 0 && !claimsAccessDenied && (
                    <p className="text-xs text-slate-400 text-center py-4">担当希望はまだありません。</p>
                  )}
                </div>
              )}
            </div>
          )}

          <CaseHistorySection
            history={caseHistory}
            isLoading={isHistoryLoading}
            error={historyError}
            userMap={userMap}
          />
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;

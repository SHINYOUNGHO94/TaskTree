"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Pencil,
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
import { RichEditor } from "../../../../components/editor/RichEditor";
import { EditCaseModal } from "../../../../components/dashboard/EditCaseModal";

type ErrorType = "notFound" | "forbidden" | "error";
type DetailTab = "tasks" | "comments" | "history" | "children";

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

const CASE_TYPE_ACCENT: Record<CaseType, string> = {
  [CaseType.REQUEST]:  "bg-amber-500",
  [CaseType.STANDARD]: "bg-blue-600",
  [CaseType.PROJECT]:  "bg-violet-600",
};

const OWNER_TYPE_LABELS: Record<CaseOwnerType, string> = {
  [CaseOwnerType.USER]:       "User",
  [CaseOwnerType.TEAM]:       "Team",
  [CaseOwnerType.DEPARTMENT]: "Department",
  [CaseOwnerType.DIVISION]:   "Division",
  [CaseOwnerType.COMPANY]:    "Company",
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
  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 my-2">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

const CaseDetailPage = () => {
  const { t } = useTranslation("ui");
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildBackUrl = () => {
    const params = new URLSearchParams();
    const caseView     = searchParams.get("caseView");
    const caseType     = searchParams.get("caseType");
    const status       = searchParams.get("status");
    const deliveryType = searchParams.get("deliveryType");
    const ownership    = searchParams.get("ownership");
    const sort         = searchParams.get("sort");
    const q            = searchParams.get("q");
    if (caseView)      params.set("caseView", caseView);
    if (caseType)      params.set("caseType", caseType);
    if (status)        params.set("status", status);
    if (deliveryType)  params.set("deliveryType", deliveryType);
    if (ownership)     params.set("ownership", ownership);
    if (sort)          params.set("sort", sort);
    if (q)             params.set("q", q);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  };

  const [caseDetail, setCaseDetail]                   = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading]                     = useState(true);
  const [errorType, setErrorType]                     = useState<ErrorType | null>(null);
  const [selectedStatus, setSelectedStatus]           = useState<CaseStatus | null>(null);
  const [isUpdating, setIsUpdating]                   = useState(false);
  const [updateError, setUpdateError]                 = useState<string | null>(null);
  const [isDeletingCase, setIsDeletingCase]           = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]     = useState(false);
  const [deleteError, setDeleteError]                 = useState<string | null>(null);
  const [caseTasks, setCaseTasks]                     = useState<CaseTaskDetail[]>([]);
  const [isTasksLoading, setIsTasksLoading]           = useState(false);
  const [tasksError, setTasksError]                   = useState<string | null>(null);
  const [caseHistory, setCaseHistory]                 = useState<CaseHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading]       = useState(false);
  const [historyError, setHistoryError]               = useState<string | null>(null);
  const [caseComments, setCaseComments]               = useState<CaseComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading]     = useState(false);
  const [commentsError, setCommentsError]             = useState<string | null>(null);
  const [currentUserId, setCurrentUserId]             = useState<string | null>(null);
  const [currentProfile, setCurrentProfile]           = useState<UserProfile | null>(null);
  const [claimRequests, setClaimRequests]             = useState<CaseClaimRequest[]>([]);
  const [isClaimsLoading, setIsClaimsLoading]         = useState(false);
  const [claimsError, setClaimsError]                 = useState<string | null>(null);
  const [claimsAccessDenied, setClaimsAccessDenied]   = useState(false);
  const [claimMessage, setClaimMessage]               = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim]     = useState(false);
  const [claimSubmitError, setClaimSubmitError]       = useState<string | null>(null);
  const [isProcessingClaimAction, setIsProcessingClaimAction] = useState(false);
  const [claimActionError, setClaimActionError]       = useState<string | null>(null);
  const [childCases, setChildCases]                   = useState<CaseDetail[]>([]);
  const [isChildCasesLoading, setIsChildCasesLoading] = useState(false);
  const [childCasesError, setChildCasesError]         = useState<string | null>(null);
  const [requestChildrenByStandard, setRequestChildrenByStandard] = useState<Record<string, CaseDetail[]>>({});
  const [isNestedLoading, setIsNestedLoading]         = useState(false);
  const [nestedChildCasesError, setNestedChildCasesError] = useState<string | null>(null);
  const [participantCompanies, setParticipantCompanies] = useState<CaseParticipantCompany[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError]     = useState<string | null>(null);
  const [userMap, setUserMap]                         = useState<Map<string, { name: string; email: string }>>(new Map());
  const [activeTab, setActiveTab]                     = useState<DetailTab>("tasks");
  const [showEditModal, setShowEditModal]             = useState(false);
  const [copiedId, setCopiedId]                       = useState(false);

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

  const handleDeleteCase = async () => {
    if (!caseDetail) return;
    setIsDeletingCase(true);
    setDeleteError(null);
    try {
      await CaseService.deleteCase(caseDetail.caseId);
      router.push(buildBackUrl());
    } catch {
      setDeleteError(t("Failed to delete case. Please try again."));
      setIsDeletingCase(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !caseDetail || selectedStatus === caseDetail.status) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await CaseService.updateCaseStatus(id as string, { status: selectedStatus });
      await Promise.all([fetchCase(), fetchCaseHistory()]);
    } catch (error) {
      console.error("Failed to update case status", error);
      setUpdateError("Failed to update status. Please try again.");
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
      setTasksError("Failed to load tasks.");
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
        setClaimsError("Failed to load claim requests.");
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
      setClaimSubmitError("Failed to submit claim request. Please try again.");
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
      setClaimActionError("Failed to process.");
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
      setChildCasesError("Failed to load sub-cases.");
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
        setNestedChildCasesError("Some sub-cases could not be loaded.");
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
      setHistoryError("Failed to load history.");
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
      setCommentsError("Failed to load comments.");
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
      setParticipantsError("Failed to load participant companies.");
    } finally {
      setIsParticipantsLoading(false);
    }
  }, [id]);

  const handleEditSuccess = (updatedFields: {
    title: string;
    description: string;
    descriptionFormat?: "plain" | "tiptap_json";
    descriptionText?: string;
    dueDate: string | null;
  }) => {
    setCaseDetail((prev) => (prev ? { ...prev, ...updatedFields } : prev));
    void fetchCase();
    void fetchCaseHistory();
  };

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
        <div className="h-6 w-16 bg-slate-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg overflow-hidden border border-slate-100 shadow-sm">
              <div className="h-1 bg-slate-200" />
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                </div>
                <div className="h-7 bg-slate-200 rounded w-3/4" />
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-100 p-4 space-y-3 shadow-sm">
              <div className="h-3 bg-slate-200 rounded w-20" />
              <div className="h-8 bg-slate-100 rounded" />
              <div className="h-8 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorType) {
    const errorConfig = {
      notFound:  { title: t("Case not found"),    message: t("This case does not exist or has been deleted.") },
      forbidden: { title: t("Access denied"),      message: t("You don't have permission to view this case.") },
      error:     { title: t("An error occurred"),  message: t("Failed to load case. Please try again.") },
    }[errorType];

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push(buildBackUrl())}
          className="group flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-all text-sm font-medium mb-8"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          {t("Back")}
        </button>
        <div className="text-center py-24 bg-white border border-slate-100 rounded-lg shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{errorConfig.title}</h2>
          <p className="text-slate-400 text-sm">{errorConfig.message}</p>
        </div>
      </div>
    );
  }

  if (!caseDetail) return null;

  const canEdit =
    currentUserId !== null &&
    (caseDetail.creatorId === currentUserId ||
      (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId));

  const completedTasks = caseTasks.filter((task) => String(task.status) === "DONE").length;
  const totalTasks     = caseTasks.length;
  const taskProgress   = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const hasChildren = caseDetail.caseType !== CaseType.REQUEST;

  const tabs: { id: DetailTab; label: string; count: number }[] = [
    { id: "tasks",    label: t("Tasks"),     count: totalTasks },
    { id: "comments", label: t("Comments"),  count: caseComments.length },
    { id: "history",  label: t("History"),   count: caseHistory.length },
    ...(hasChildren ? [{ id: "children" as DetailTab, label: t("Sub-cases"), count: childCases.length }] : []),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => router.push(buildBackUrl())}
            className="group flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-all duration-200 text-sm font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
            {t("Back")}
          </button>
          {caseDetail.parentCaseId && (
            <>
              <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
              <button
                onClick={() => router.push(`/dashboard/cases/${caseDetail.parentCaseId}`)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium truncate max-w-[140px] hover:underline flex-shrink-0"
                title={t("Go to parent case")}
              >
                {t("Parent Case")}
              </button>
            </>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-colors flex-shrink-0"
          >
            <Pencil size={13} />
            {t("Edit")}
          </button>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left: unified card (info + tabs) */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

            {/* Type accent bar */}
            <div className={`h-1 w-full ${CASE_TYPE_ACCENT[caseDetail.caseType]}`} />

            {/* Case info */}
            <div className="p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[caseDetail.status]}`}>
                  {t(CASE_STATUS_LABELS[caseDetail.status])}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${CASE_TYPE_STYLES[caseDetail.caseType]}`}>
                  {t(CASE_TYPE_LABELS[caseDetail.caseType])}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">
                  {t(CASE_DELIVERY_TYPE_LABELS[caseDetail.deliveryType])}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-5 leading-tight">
                {caseDetail.title}
              </h1>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {t("Description")}
                </h3>
                <RichEditor
                  description={caseDetail.description}
                  descriptionFormat={caseDetail.descriptionFormat}
                  readOnly
                />
              </div>
            </div>

            {/* Tab navigation */}
            <div className="border-t border-slate-200 overflow-x-auto">
              <div className="flex min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          activeTab === tab.id
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="p-4 md:p-6">
              {activeTab === "tasks" && (
                <CaseTasksSection
                  caseId={id as string}
                  caseDetail={caseDetail}
                  caseTasks={caseTasks}
                  isTasksLoading={isTasksLoading}
                  tasksError={tasksError}
                  currentUserId={currentUserId}
                  currentProfile={currentProfile}
                  userMap={userMap}
                  onTaskChange={async () => {
                    await Promise.all([fetchCaseTasks(), fetchCaseHistory()]);
                  }}
                />
              )}
              {activeTab === "comments" && (
                <CaseCommentsSection
                  caseId={id as string}
                  comments={caseComments}
                  isLoading={isCommentsLoading}
                  error={commentsError}
                  userMap={userMap}
                  onRefresh={fetchCaseComments}
                />
              )}
              {activeTab === "history" && (
                <CaseHistorySection
                  history={caseHistory}
                  isLoading={isHistoryLoading}
                  error={historyError}
                  userMap={userMap}
                />
              )}
              {activeTab === "children" && hasChildren && (
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
                  onCreated={async () => {
                    await Promise.all([fetchChildCases(), fetchCaseHistory()]);
                  }}
                  onNavigate={(caseId) => router.push(`/dashboard/cases/${caseId}`)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: sticky sidebar */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">

          {/* Task progress */}
          {totalTasks > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">{t("Progress")}</span>
                <span className="text-xs font-semibold text-slate-500">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${taskProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">{taskProgress}% {t("complete")}</p>
            </div>
          )}

          {/* Status update */}
          {canEdit && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                {t("Update Status")}
              </h3>
              <div className="space-y-2">
                <select
                  value={selectedStatus ?? caseDetail.status}
                  onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                  disabled={isUpdating}
                  className="w-full text-sm font-medium border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400 disabled:opacity-50 transition-all cursor-pointer hover:border-slate-300"
                >
                  {UPDATABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(CASE_STATUS_LABELS[s])}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || selectedStatus === caseDetail.status}
                  className="w-full text-sm font-bold px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? t("Updating...") : t("Update Status")}
                </button>
                {updateError && <ErrorAlert message={t(updateError)} />}
              </div>
            </div>
          )}

          {/* Case specs */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-700">{t("Case Specs")}</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(caseDetail.caseId).then(() => {
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }).catch(() => { /* clipboard unavailable */ });
                }}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                title={t("Copy case ID")}
              >
                {copiedId
                  ? <Check size={11} className="text-emerald-500" />
                  : <Copy size={11} />
                }
                <span className="font-mono">{shortId(caseDetail.caseId)}</span>
              </button>
            </div>
            <div className="space-y-3">

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Due Date")}</span>
                  <span className="text-sm font-semibold text-slate-700">{caseDetail.dueDate ?? t("No due date")}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Created At")}</span>
                  <span className="text-sm font-semibold text-slate-700">{new Date(caseDetail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Last Updated")}</span>
                  <span className="text-sm font-semibold text-slate-700">{new Date(caseDetail.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Tag size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Scope")}</span>
                  <span className="text-sm font-semibold text-slate-700">{t(CASE_TARGET_SCOPE_LABELS[caseDetail.targetScope])}</span>
                  <span className="text-xs text-slate-500 block mt-0.5 max-w-[160px] truncate" title={caseDetail.targetScope === CaseTargetScope.USER ? resolveDisplayName(caseDetail.targetScopeId, userMap) : shortId(caseDetail.targetScopeId)}>
                    {caseDetail.targetScope === CaseTargetScope.USER ? resolveDisplayName(caseDetail.targetScopeId, userMap) : shortId(caseDetail.targetScopeId)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Required Role")}</span>
                  <span className="text-sm font-semibold text-slate-700">{t(USER_ROLE_LABELS[caseDetail.requiredRole])}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Owner")}</span>
                  <span className="text-sm font-semibold text-slate-700">{t(OWNER_TYPE_LABELS[caseDetail.ownerType])}</span>
                  <span className="text-xs text-slate-500 block mt-0.5 max-w-[160px] truncate" title={caseDetail.ownerType === CaseOwnerType.USER ? resolveDisplayName(caseDetail.ownerId, userMap) : shortId(caseDetail.ownerId)}>
                    {caseDetail.ownerType === CaseOwnerType.USER ? resolveDisplayName(caseDetail.ownerId, userMap) : shortId(caseDetail.ownerId)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={11} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Creator")}</span>
                  <span className="text-xs text-slate-500 block max-w-[160px] truncate mt-0.5" title={resolveDisplayName(caseDetail.creatorId, userMap)}>
                    {resolveDisplayName(caseDetail.creatorId, userMap)}
                  </span>
                </div>
              </div>

              {caseDetail.projectId && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={11} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Project")}</span>
                    <button
                      onClick={() => router.push(`/dashboard/cases/${caseDetail.projectId}`)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:underline block max-w-[160px] truncate mt-0.5"
                      title={caseDetail.projectId}
                    >
                      {shortId(caseDetail.projectId ?? "")}
                    </button>
                  </div>
                </div>
              )}

              {caseDetail.parentCaseId && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={11} className="text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{t("Parent Case")}</span>
                    <button
                      onClick={() => router.push(`/dashboard/cases/${caseDetail.parentCaseId}`)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:underline block max-w-[160px] truncate mt-0.5"
                      title={caseDetail.parentCaseId}
                    >
                      {shortId(caseDetail.parentCaseId ?? "")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participant companies */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && caseDetail.caseType !== CaseType.REQUEST && (
            <CaseParticipantCompanySection
              caseId={id as string}
              caseDetail={caseDetail}
              participantCompanies={participantCompanies}
              isParticipantsLoading={isParticipantsLoading}
              participantsError={participantsError}
              currentUserId={currentUserId}
              onRefresh={async () => {
                await Promise.all([fetchParticipantCompanies(), fetchCaseHistory()]);
              }}
            />
          )}

          {/* Claim requests */}
          {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4">{t("Claim Requests")}</h3>

              {isClaimsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                </div>
              ) : claimsError ? (
                <ErrorAlert message={t(claimsError)} />
              ) : (
                <div className="space-y-4">
                  {claimActionError && <ErrorAlert message={t(claimActionError)} />}

                  {claimRequests.length > 0 && (
                    <ul className="space-y-3">
                      {claimRequests.map((req) => (
                        <li key={req.claimRequestId} className="border border-slate-100 rounded-lg p-3 bg-slate-50/40">
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
                              {req.status === CaseClaimRequestStatus.PENDING ? t("Pending") : req.status === CaseClaimRequestStatus.APPROVED ? t("Approved") : t("Rejected")}
                            </span>
                          </div>
                          {req.message && (
                            <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-100 mb-2 leading-relaxed">{req.message}</p>
                          )}
                          {req.rejectReason && (
                            <p className="text-[10px] text-rose-500 bg-rose-50 p-2 rounded border border-rose-100 mb-2">{t("Reject reason: ")}{req.rejectReason}</p>
                          )}
                          {req.status === CaseClaimRequestStatus.PENDING &&
                            currentUserId &&
                            (caseDetail.creatorId === currentUserId ||
                              (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId)) && (
                              <div className="flex gap-2 mt-3 justify-end">
                                <button
                                  onClick={() => handleClaimAction(req.claimRequestId, "APPROVED")}
                                  disabled={isProcessingClaimAction}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {t("Approve")}
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = window.prompt(t("Enter rejection reason"));
                                    if (reason && reason.trim()) {
                                      void handleClaimAction(req.claimRequestId, "REJECTED", reason.trim());
                                    }
                                  }}
                                  disabled={isProcessingClaimAction}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {t("Reject")}
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
                        {claimSubmitError && <ErrorAlert message={t(claimSubmitError)} />}
                        <textarea
                          value={claimMessage}
                          onChange={(e) => setClaimMessage(e.target.value)}
                          placeholder={t("Claim reason (optional)...")}
                          rows={2}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-400 resize-none transition-all"
                        />
                        <button
                          onClick={handleSubmitClaim}
                          disabled={isSubmittingClaim}
                          className="w-full text-xs font-bold py-2.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSubmittingClaim ? t("Sending...") : t("Submit Claim")}
                        </button>
                      </div>
                    )}

                  {claimRequests.length === 0 && !claimsAccessDenied && (
                    <p className="text-xs text-slate-400 text-center py-4">{t("No claim requests yet.")}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delete case (creator only) */}
          {currentUserId && caseDetail.creatorId === currentUserId && (
            <div className="bg-white border border-red-100 rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-bold text-red-700 mb-2">{t("Delete Case")}</h3>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {t("Deletes this case and all sub-cases, tasks, and history permanently.")}
              </p>
              {deleteError && <ErrorAlert message={t(deleteError)} />}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeletingCase}
                className="w-full text-sm font-bold px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("Delete Case")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          caseDetail={caseDetail}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-2">{t("Delete Case")}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t("This will permanently delete the case and all sub-cases, tasks, comments, and history. This action cannot be undone.")}
              </p>
              {deleteError && <div className="mt-3"><ErrorAlert message={t(deleteError)} /></div>}
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                disabled={isDeletingCase}
                className="text-sm font-bold px-4 py-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleDeleteCase}
                disabled={isDeletingCase}
                className="text-sm font-bold px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isDeletingCase ? t("Deleting...") : t("Delete (confirm)")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseDetailPage;

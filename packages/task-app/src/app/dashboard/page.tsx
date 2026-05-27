"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FileText, LayoutGrid, List, Plus, RefreshCw, Search, Mail, X, Pencil } from "lucide-react";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseService,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  ParticipantCompanyInvitation,
} from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { CaseBoardView } from "../../components/dashboard/CaseBoardView";
import { CaseCard } from "../../components/dashboard/CaseCard";
import { CreateCaseModal } from "../../components/dashboard/CreateCaseModal";
import { EditCaseModal } from "../../components/dashboard/EditCaseModal";
import { CASE_DELIVERY_TYPE_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "../../components/dashboard/caseLabels";

type ViewMode = "list" | "board";
type CaseTypeFilter = "ALL" | CaseType;
type CaseStatusFilter = "ALL" | CaseStatus;
type DeliveryTypeFilter = "ALL" | CaseDeliveryType;
type OwnershipFilter = "ALL" | "CREATED_BY_ME" | "OWNED_BY_ME";
type SortKey = "updatedAt_desc" | "createdAt_desc" | "dueDate_asc" | "status" | "caseType";
type CaseAreaTab = "MY" | "OPEN" | "ORG" | "PROJECT";

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

const STATUS_DOT: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]:          'bg-slate-400',
  [CaseStatus.IN_PROGRESS]:      'bg-sky-500',
  [CaseStatus.REVIEW_REQUESTED]: 'bg-violet-500',
  [CaseStatus.COMPLETED]:        'bg-emerald-500',
  [CaseStatus.ON_HOLD]:          'bg-amber-400',
  [CaseStatus.CANCELED]:         'bg-rose-400',
  [CaseStatus.REOPENED]:         'bg-orange-400',
};

const CASE_TYPE_BADGE: Record<CaseType, string> = {
  [CaseType.REQUEST]:  'bg-amber-50 text-amber-700',
  [CaseType.STANDARD]: 'bg-blue-50 text-blue-700',
  [CaseType.PROJECT]:  'bg-violet-50 text-violet-700',
};

const STATUS_PILL_IDLE: Record<CaseStatus, string> = {
  [CaseStatus.IN_PROGRESS]:      'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  [CaseStatus.REVIEW_REQUESTED]: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  [CaseStatus.WAITING]:          'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
  [CaseStatus.REOPENED]:         'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  [CaseStatus.ON_HOLD]:          'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  [CaseStatus.COMPLETED]:        'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  [CaseStatus.CANCELED]:         'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
};

const STATUS_PILL_ACTIVE: Record<CaseStatus, string> = {
  [CaseStatus.IN_PROGRESS]:      'bg-sky-500 text-white border-sky-500',
  [CaseStatus.REVIEW_REQUESTED]: 'bg-violet-500 text-white border-violet-500',
  [CaseStatus.WAITING]:          'bg-slate-400 text-white border-slate-400',
  [CaseStatus.REOPENED]:         'bg-orange-400 text-white border-orange-400',
  [CaseStatus.ON_HOLD]:          'bg-amber-400 text-white border-amber-400',
  [CaseStatus.COMPLETED]:        'bg-emerald-500 text-white border-emerald-500',
  [CaseStatus.CANCELED]:         'bg-rose-500 text-white border-rose-500',
};

function filterByArea(cases: CaseDetail[], tab: CaseAreaTab, userId: string): CaseDetail[] {
  switch (tab) {
    case "MY":      return cases.filter((c) => c.creatorId === userId || c.ownerId === userId);
    case "OPEN":    return cases.filter((c) => c.deliveryType === CaseDeliveryType.OPEN);
    case "ORG":     return cases.filter((c) => c.targetScope !== CaseTargetScope.USER);
    case "PROJECT": return cases.filter((c) => c.caseType === CaseType.PROJECT);
    default:        return cases;
  }
}

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
      const searchableDescription =
        c.descriptionText ?? (c.descriptionFormat !== "tiptap_json" ? c.description : "");
      const match =
        c.title.toLowerCase().includes(q) ||
        searchableDescription.toLowerCase().includes(q) ||
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
      case "updatedAt_desc":  return b.updatedAt.localeCompare(a.updatedAt);
      case "createdAt_desc":  return b.createdAt.localeCompare(a.createdAt);
      case "dueDate_asc": {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case "status":    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      case "caseType":  return CASE_TYPE_ORDER[a.caseType] - CASE_TYPE_ORDER[b.caseType];
      default:          return 0;
    }
  });

  return result;
}

const DashboardPage = () => {
  const { user, profile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation("ui");

  const SORT_LABELS: Record<SortKey, string> = useMemo(() => ({
    updatedAt_desc: t("Updated (newest)"),
    createdAt_desc: t("Created (newest)"),
    dueDate_asc:    t("Due Date (earliest)"),
    status:         t("By Status"),
    caseType:       t("By Case Type"),
  }), [t]);

  const TAB_LABELS: Record<CaseAreaTab, string> = useMemo(() => ({
    MY:      t("My Cases"),
    OPEN:    t("Open Cases"),
    ORG:     t("Org Cases"),
    PROJECT: t("Projects"),
  }), [t]);

  const TAB_EMPTY_MESSAGES: Record<CaseAreaTab, string> = useMemo(() => ({
    MY:      t("No cases (MY)"),
    OPEN:    t("No cases (OPEN)"),
    ORG:     t("No cases (ORG)"),
    PROJECT: t("No cases (PROJECT)"),
  }), [t]);

  const TAB_DESCRIPTIONS: Record<CaseAreaTab, string> = useMemo(() => ({
    MY:      t("My Cases description"),
    OPEN:    t("Open Cases description"),
    ORG:     t("Org Cases description"),
    PROJECT: t("Projects description"),
  }), [t]);

  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseDetail | null>(null);

  const [invitations, setInvitations] = useState<ParticipantCompanyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [invitationActionErrors, setInvitationActionErrors] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<CaseAreaTab>("MY");
  const [activePill, setActivePill] = useState<CaseStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseTypeFilter>((searchParams.get("caseType") as CaseTypeFilter) ?? "ALL");
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>((searchParams.get("status") as CaseStatusFilter) ?? "ALL");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<DeliveryTypeFilter>((searchParams.get("deliveryType") as DeliveryTypeFilter) ?? "ALL");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>((searchParams.get("ownership") as OwnershipFilter) ?? "ALL");
  const [sortKey, setSortKey] = useState<SortKey>((searchParams.get("sort") as SortKey) ?? "updatedAt_desc");
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get("caseView") as ViewMode) ?? "board");

  useEffect(() => {
    if (user) {
      fetchCases();
      fetchInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCases = async () => {
    setCasesLoading(true);
    setCasesError(null);
    try {
      const data = await CaseService.getCases();
      setCases(data);
    } catch (error) {
      console.error("Failed to fetch cases", error);
      setCasesError(t("Failed to load cases."));
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
      setInvitationsError(t("Failed to load invitations."));
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
        [key]: t("Failed to process."),
      }));
    } finally {
      setProcessingInvitation(null);
    }
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

  const resetFilters = () => {
    setSearchQuery("");
    setCaseTypeFilter("ALL");
    setStatusFilter("ALL");
    setDeliveryTypeFilter("ALL");
    setOwnershipFilter("ALL");
  };

  const handleTabChange = (tab: CaseAreaTab) => {
    setActiveTab(tab);
    setActivePill("ALL");
    resetFilters();
  };

  const handleEditCase = (caseDetail: CaseDetail) => {
    setEditingCase(caseDetail);
  };

  const handleEditSuccess = (
    updatedFields: { title: string; description: string; dueDate: string | null },
  ) => {
    if (!editingCase) return;
    setCases((prev) =>
      prev.map((c) =>
        c.caseId === editingCase.caseId
          ? { ...c, ...updatedFields, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  };

  const handlePillClick = (status: CaseStatus | "ALL") => {
    setActivePill(status);
  };

  const isPillFiltered = activePill !== "ALL";

  const tabFilteredCases = useMemo(
    () => filterByArea(cases, activeTab, user?.id ?? ""),
    [cases, activeTab, user?.id],
  );

  const filteredCases = useMemo(
    () => applyFiltersAndSort(tabFilteredCases, user?.id ?? "", searchQuery, caseTypeFilter, statusFilter, deliveryTypeFilter, ownershipFilter, sortKey),
    [tabFilteredCases, user?.id, searchQuery, caseTypeFilter, statusFilter, deliveryTypeFilter, ownershipFilter, sortKey],
  );

  const pillFilteredCases = useMemo(
    () => isPillFiltered ? filteredCases.filter((c) => c.status === activePill) : filteredCases,
    [filteredCases, isPillFiltered, activePill],
  );

  if (!user) return null;

  return (
    <section>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t("Cases")}</h2>
          <p className="text-slate-600 text-sm mt-1">{t("Manage cases and tasks")}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { fetchCases(); fetchInvitations(); }}
            className="p-2 border border-slate-200 bg-white rounded-md hover:bg-slate-50 transition-colors text-slate-400"
            title={t("Refresh")}
          >
            <RefreshCw size={15} className={casesLoading ? "animate-spin" : ""} />
          </button>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            onClick={() => setIsCaseModalOpen(true)}
          >
            <Plus size={15} /> {t("Create Case")}
          </button>
        </div>
      </div>

      {/* Case section */}
      <div className="mb-10">
        {/* Area tabs */}
        <div className="overflow-x-auto mb-4">
          <div className="flex gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200 w-fit">
            {(["MY", "OPEN", "ORG", "PROJECT"] as CaseAreaTab[]).map((tab) => {
              const count = filterByArea(cases, tab, user.id).length;
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {TAB_LABELS[tab]}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status pills */}
        <div className="overflow-x-auto mb-4">
          <div className="flex gap-2 w-max">
            {/* ALL pill */}
            <button
              onClick={() => handlePillClick("ALL")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                activePill === "ALL"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t("All")}
              <span className="ml-1.5 text-[10px] font-bold opacity-80">
                {filteredCases.length}
              </span>
            </button>
            {(Object.values(CaseStatus) as CaseStatus[]).map((status) => {
              const count = filteredCases.filter((c) => c.status === status).length;
              const isActive = activePill === status;
              const isEmpty = count === 0;
              return (
                <button
                  key={status}
                  onClick={() => handlePillClick(status)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                    isActive
                      ? STATUS_PILL_ACTIVE[status]
                      : `${STATUS_PILL_IDLE[status]} ${isEmpty ? "opacity-40 cursor-default" : ""}`
                  }`}
                  disabled={isEmpty && !isActive}
                >
                  {t(CASE_STATUS_LABELS[status])}
                  <span className="ml-1.5 text-[10px] font-bold opacity-80">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">{TAB_DESCRIPTIONS[activeTab]}</p>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 p-2.5 rounded-md flex flex-wrap gap-2 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("Search cases...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {[
            { value: caseTypeFilter, onChange: setCaseTypeFilter as (v: string) => void, options: [
              { value: "ALL", label: `${t("Type")}: ${t("All")}` },
              { value: CaseType.REQUEST, label: t(CASE_TYPE_LABELS[CaseType.REQUEST]) },
              { value: CaseType.STANDARD, label: t(CASE_TYPE_LABELS[CaseType.STANDARD]) },
              { value: CaseType.PROJECT, label: t(CASE_TYPE_LABELS[CaseType.PROJECT]) },
            ]},
            { value: statusFilter, onChange: setStatusFilter as (v: string) => void, options: [
              { value: "ALL", label: `${t("Status")}: ${t("All")}` },
              ...Object.values(CaseStatus).map((s) => ({ value: s, label: t(CASE_STATUS_LABELS[s]) })),
            ]},
            { value: deliveryTypeFilter, onChange: setDeliveryTypeFilter as (v: string) => void, options: [
              { value: "ALL", label: `${t("Delivery")}: ${t("All")}` },
              { value: CaseDeliveryType.DIRECT, label: t(CASE_DELIVERY_TYPE_LABELS[CaseDeliveryType.DIRECT]) },
              { value: CaseDeliveryType.OPEN, label: t(CASE_DELIVERY_TYPE_LABELS[CaseDeliveryType.OPEN]) },
            ]},
            { value: ownershipFilter, onChange: setOwnershipFilter as (v: string) => void, options: [
              { value: "ALL", label: `${t("Ownership")}: ${t("All")}` },
              { value: "CREATED_BY_ME", label: t("Created by me") },
              { value: "OWNED_BY_ME", label: t("Assigned to me") },
            ]},
            { value: sortKey, onChange: setSortKey as (v: string) => void, options: (Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ value: k, label: SORT_LABELS[k] })) },
          ].map((select, i) => (
            <select
              key={i}
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              {select.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ))}

          <div className="flex flex-shrink-0 border border-slate-200 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 transition-colors ${viewMode === "board" ? "bg-indigo-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 border-l border-slate-200 transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {casesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center justify-between gap-4">
            <span>{casesError}</span>
            <button onClick={fetchCases} className="text-xs font-bold underline text-red-600 hover:text-red-800 shrink-0">
              {t("Retry")}
            </button>
          </div>
        )}

        {/* Case list / board */}
        {casesLoading ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden animate-pulse">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex gap-8">
              {["w-16", "w-48", "w-24", "w-20", "w-20"].map((w, i) => (
                <div key={i} className={`h-3 ${w} bg-slate-200 rounded`} />
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3.5 border-b border-slate-100 flex gap-8 items-center last:border-0">
                <div className="h-4 w-16 bg-slate-100 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : tabFilteredCases.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <FileText size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{TAB_EMPTY_MESSAGES[activeTab]}</p>
            {activeTab === "MY" && (
              <button
                onClick={() => setIsCaseModalOpen(true)}
                className="mt-3 px-4 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                {t("Create Case")}
              </button>
            )}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Search size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{t("No results matching filters")}</p>
            <button
              onClick={resetFilters}
              className="mt-3 px-4 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              {t("Reset filters")}
            </button>
          </div>
        ) : isPillFiltered && pillFilteredCases.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Search size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">{t("No results matching filters")}</p>
            <button
              onClick={() => setActivePill("ALL")}
              className="mt-3 px-4 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              {t("Show all")}
            </button>
          </div>
        ) : isPillFiltered ? (
          /* Pill-filtered grid: show only selected status in card grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillFilteredCases.map((c) => {
              const canEdit = c.creatorId === user.id || (c.ownerType === CaseOwnerType.USER && c.ownerId === user.id);
              return (
                <CaseCard key={c.caseId} caseDetail={c} onClick={handleCaseClick} onEdit={canEdit ? handleEditCase : undefined} />
              );
            })}
          </div>
        ) : viewMode === "board" ? (
          <CaseBoardView cases={filteredCases} onCaseClick={handleCaseClick} onEditCase={handleEditCase} currentUserId={user.id} emptyMessage={TAB_EMPTY_MESSAGES[activeTab]} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-24">{t("Type")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t("Title")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-32">{t("Status")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Due Date (optional)")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Updated")}</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => {
                  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
                  const soonLimit = (() => { const d = new Date(); d.setDate(d.getDate() + 3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
                  const isDueDateOverdue = c.dueDate && c.dueDate < today;
                  const isDueDateSoon = c.dueDate && !isDueDateOverdue && c.dueDate <= soonLimit;
                  const canEdit = c.creatorId === user.id || (c.ownerType === CaseOwnerType.USER && c.ownerId === user.id);
                  return (
                  <tr
                    key={c.caseId}
                    onClick={() => handleCaseClick(c.caseId)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CASE_TYPE_BADGE[c.caseType]}`}>
                        {t(CASE_TYPE_LABELS[c.caseType])}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-xs">{c.title}</p>
                      {c.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5 leading-relaxed">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[c.status]}`} />
                        <span className="text-xs font-medium text-slate-700">{t(CASE_STATUS_LABELS[c.status])}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${isDueDateOverdue ? 'text-rose-600' : isDueDateSoon ? 'text-amber-600' : 'text-slate-600'}`}>
                      {c.dueDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditCase(c); }}
                          className="p-1 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
                          title={t("Edit Case")}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* External invitations */}
      <div className="mt-6 bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
        <div className="p-5">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{t("External Case Invitations")}</h2>
                <p className="text-slate-500 text-xs mt-0.5">{t("Case invitations from other companies")}</p>
              </div>
            </div>
            {invitations.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {invitations.length}
              </span>
            )}
          </div>

          {invitationsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center justify-between gap-4">
              <span>{invitationsError}</span>
              <button onClick={fetchInvitations} className="text-xs font-medium underline text-red-600 hover:text-red-800 shrink-0">{t("Retry")}</button>
            </div>
          )}

          {invitationsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-slate-50 border border-slate-100 animate-pulse rounded-md" />
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-md bg-slate-50/40">
              <p className="text-sm">{t("No external invitations.")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {invitations.map((inv) => {
                const key = `${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`;
                const isProcessing = processingInvitation === key;
                const invActionError = invitationActionErrors[key];
                return (
                  <li key={key} className="bg-slate-50 border border-slate-200 hover:bg-white transition-colors rounded-md p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED ? t("Invited (status)") : t("Active (status)")}
                          </span>
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-white rounded border border-slate-200">
                            {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])} / {t(CASE_STATUS_LABELS[inv.caseSummary.status])}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate mb-0.5">{inv.caseSummary.title}</p>
                        <p className="text-xs text-slate-500">
                          {t("Invited by (colon)")} <span className="font-medium text-slate-700">{inv.participantCompany.invitedBy}</span>
                        </p>
                        {invActionError && <p className="text-xs text-red-600 mt-1">{invActionError}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED && (
                          <button
                            onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
                            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                          >
                            {t("View Details")}
                          </button>
                        )}
                        {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED && (
                          <>
                            <button
                              onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
                              disabled={isProcessing}
                              className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {isProcessing ? t("Processing...") : t("Approve")}
                            </button>
                            <button
                              onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.REJECTED)}
                              disabled={isProcessing}
                              className="text-xs font-medium px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {isProcessing ? t("Processing...") : t("Reject")}
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
      </div>

      <CreateCaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSuccess={fetchCases}
        profile={profile}
        userId={user.id}
      />

      {editingCase && (
        <EditCaseModal
          isOpen={editingCase !== null}
          onClose={() => setEditingCase(null)}
          caseDetail={editingCase}
          onSuccess={handleEditSuccess}
        />
      )}
    </section>
  );
};

export default DashboardPage;

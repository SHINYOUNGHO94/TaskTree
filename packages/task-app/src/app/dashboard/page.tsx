"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, LayoutGrid, List, Plus, RefreshCw, Search, Mail, X } from "lucide-react";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseParticipantCompanyStatus,
  CaseService,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  ParticipantCompanyInvitation,
} from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { CaseBoardView } from "../../components/dashboard/CaseBoardView";
import { CreateCaseModal } from "../../components/dashboard/CreateCaseModal";
import { CASE_DELIVERY_TYPE_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "../../components/dashboard/caseLabels";

type ViewMode = "list" | "board";
type CaseTypeFilter = "ALL" | CaseType;
type CaseStatusFilter = "ALL" | CaseStatus;
type DeliveryTypeFilter = "ALL" | CaseDeliveryType;
type OwnershipFilter = "ALL" | "CREATED_BY_ME" | "OWNED_BY_ME";
type SortKey = "updatedAt_desc" | "createdAt_desc" | "dueDate_asc" | "status" | "caseType";
type CaseAreaTab = "MY" | "OPEN" | "ORG" | "PROJECT";

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt_desc: "更新日 (新しい順)",
  createdAt_desc: "作成日 (新しい順)",
  dueDate_asc: "期限 (近い順)",
  status: "ステータス",
  caseType: "案件種別",
};

const TAB_LABELS: Record<CaseAreaTab, string> = {
  MY: "自分の案件",
  OPEN: "公開案件",
  ORG: "組織案件",
  PROJECT: "プロジェクト",
};

const TAB_EMPTY_MESSAGES: Record<CaseAreaTab, string> = {
  MY: "自分が作成または担当している案件はありません。",
  OPEN: "公募中の案件はありません。",
  ORG: "組織向けの案件はありません。",
  PROJECT: "プロジェクト案件はありません。",
};

const TAB_DESCRIPTIONS: Record<CaseAreaTab, string> = {
  MY: "自分が作成・担当する案件（案件 = 業務依頼・協業単位）",
  OPEN: "権限範囲内で担当希望できる公開案件",
  ORG: "組織・部署・チームへ向けた案件",
  PROJECT: "複数案件をまとめるプロジェクト",
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

  const [cases, setCases] = useState<CaseDetail[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);

  const [invitations, setInvitations] = useState<ParticipantCompanyInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [invitationActionErrors, setInvitationActionErrors] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<CaseAreaTab>("MY");
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
  }, [user]);

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
    resetFilters();
  };

  const tabFilteredCases = useMemo(
    () => filterByArea(cases, activeTab, user?.id ?? ""),
    [cases, activeTab, user?.id],
  );

  const filteredCases = useMemo(
    () => applyFiltersAndSort(tabFilteredCases, user?.id ?? "", searchQuery, caseTypeFilter, statusFilter, deliveryTypeFilter, ownershipFilter, sortKey),
    [tabFilteredCases, user?.id, searchQuery, caseTypeFilter, statusFilter, deliveryTypeFilter, ownershipFilter, sortKey],
  );

  if (!user) return null;

  return (
    <section>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">ダッシュボード</h2>
          <p className="text-slate-600 text-sm mt-1">
            案件（業務依頼・協業単位）と配下タスク（実作業）を管理します
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { fetchCases(); fetchInvitations(); }}
            className="p-2 border border-slate-200 bg-white rounded-md hover:bg-slate-50 transition-colors text-slate-400"
            title="更新"
          >
            <RefreshCw size={15} className={casesLoading ? "animate-spin" : ""} />
          </button>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            onClick={() => setIsCaseModalOpen(true)}
          >
            <Plus size={15} /> 案件作成
          </button>
        </div>
      </div>

      {/* Case section */}
      <div className="mb-10">
        {/* Area tabs */}
        <div className="flex gap-0.5 mb-5 bg-slate-100 p-1 rounded-md border border-slate-200 w-fit">
          {(["MY", "OPEN", "ORG", "PROJECT"] as CaseAreaTab[]).map((tab) => {
            const count = filterByArea(cases, tab, user.id).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {TAB_LABELS[tab]}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">{TAB_DESCRIPTIONS[activeTab]}</p>

        {/* Filter bar */}
        <div className="bg-white border border-slate-200 p-2.5 rounded-md flex flex-wrap gap-2 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="タイトル・説明・ID で検索"
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
              { value: "ALL", label: "種別: すべて" },
              { value: CaseType.REQUEST, label: CASE_TYPE_LABELS[CaseType.REQUEST] },
              { value: CaseType.STANDARD, label: CASE_TYPE_LABELS[CaseType.STANDARD] },
              { value: CaseType.PROJECT, label: CASE_TYPE_LABELS[CaseType.PROJECT] },
            ]},
            { value: statusFilter, onChange: setStatusFilter as (v: string) => void, options: [
              { value: "ALL", label: "状態: すべて" },
              { value: CaseStatus.WAITING, label: "待機中" },
              { value: CaseStatus.IN_PROGRESS, label: "対応中" },
              { value: CaseStatus.REVIEW_REQUESTED, label: "レビュー依頼" },
              { value: CaseStatus.COMPLETED, label: "完了" },
              { value: CaseStatus.ON_HOLD, label: "保留" },
              { value: CaseStatus.CANCELED, label: "キャンセル" },
              { value: CaseStatus.REOPENED, label: "再開" },
            ]},
            { value: deliveryTypeFilter, onChange: setDeliveryTypeFilter as (v: string) => void, options: [
              { value: "ALL", label: "配信: すべて" },
              { value: CaseDeliveryType.DIRECT, label: CASE_DELIVERY_TYPE_LABELS[CaseDeliveryType.DIRECT] },
              { value: CaseDeliveryType.OPEN, label: CASE_DELIVERY_TYPE_LABELS[CaseDeliveryType.OPEN] },
            ]},
            { value: ownershipFilter, onChange: setOwnershipFilter as (v: string) => void, options: [
              { value: "ALL", label: "担当: すべて" },
              { value: "CREATED_BY_ME", label: "自分が作成" },
              { value: "OWNED_BY_ME", label: "自分が担当" },
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
              title="ボード表示"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 border-l border-slate-200 transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-slate-400 hover:bg-slate-50"}`}
              title="リスト表示"
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {casesError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center justify-between gap-4">
            <span>{casesError}</span>
            <button onClick={fetchCases} className="text-xs font-bold underline text-red-600 hover:text-red-800 shrink-0">
              再試行
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
                案件を作成する
              </button>
            )}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-16 text-center bg-white border border-slate-200 rounded-lg flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <Search size={20} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-1">条件に一致する案件がありません</p>
            <button
              onClick={resetFilters}
              className="mt-3 px-4 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-md hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              フィルターをリセット
            </button>
          </div>
        ) : viewMode === "board" ? (
          <CaseBoardView cases={filteredCases} onCaseClick={handleCaseClick} />
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-24">種別</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">タイトル</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-32">ステータス</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">期限</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">更新日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr
                    key={c.caseId}
                    onClick={() => handleCaseClick(c.caseId)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CASE_TYPE_BADGE[c.caseType]}`}>
                        {CASE_TYPE_LABELS[c.caseType]}
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
                        <span className="text-xs font-medium text-slate-700">{CASE_STATUS_LABELS[c.status]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">{c.dueDate ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.updatedAt).toLocaleDateString('ja-JP')}</td>
                  </tr>
                ))}
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
                <h2 className="text-sm font-semibold text-slate-800">外部案件招待</h2>
                <p className="text-slate-500 text-xs mt-0.5">他社から受け取った案件参加招待</p>
              </div>
            </div>
            {invitations.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {invitations.length} 件
              </span>
            )}
          </div>

          {invitationsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center justify-between gap-4">
              <span>{invitationsError}</span>
              <button onClick={fetchInvitations} className="text-xs font-medium underline text-red-600 hover:text-red-800 shrink-0">再試行</button>
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
              <p className="text-sm">外部案件の招待はありません</p>
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
                            {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED ? "招待中" : "参加中"}
                          </span>
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-white rounded border border-slate-200">
                            {CASE_TYPE_LABELS[inv.caseSummary.caseType]} / {CASE_STATUS_LABELS[inv.caseSummary.status]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate mb-0.5">{inv.caseSummary.title}</p>
                        <p className="text-xs text-slate-500">
                          招待者: <span className="font-medium text-slate-700">{inv.participantCompany.invitedBy}</span>
                        </p>
                        {invActionError && <p className="text-xs text-red-600 mt-1">{invActionError}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED && (
                          <button
                            onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
                            className="text-xs font-medium px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                          >
                            詳細を見る
                          </button>
                        )}
                        {inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED && (
                          <>
                            <button
                              onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
                              disabled={isProcessing}
                              className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {isProcessing ? "処理中..." : "承認"}
                            </button>
                            <button
                              onClick={() => handleInvitationAction(inv, CaseParticipantCompanyStatus.REJECTED)}
                              disabled={isProcessing}
                              className="text-xs font-medium px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

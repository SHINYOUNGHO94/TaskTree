"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  CaseParticipantCompanyStatus,
  CaseService,
  CaseStatus,
  CaseType,
  EmailInvitation,
  ParticipantCompanyInvitation,
} from "@task/core";
import {
  Handshake,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Mail,
  Send,
  ArrowDownToLine,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from "../../../components/dashboard/caseLabels";

// ── constants ────────────────────────────────────────────────

type PartnersTab = "received" | "sent" | "history";

const STATUS_BADGE: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]:  "bg-amber-50 text-amber-700 border border-amber-200",
  [CaseParticipantCompanyStatus.ACTIVE]:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  [CaseParticipantCompanyStatus.REJECTED]: "bg-red-50 text-red-600 border border-red-200",
  [CaseParticipantCompanyStatus.REMOVED]:  "bg-slate-100 text-slate-500 border border-slate-200",
};

const STATUS_LABEL_KEY: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]:  "Invited (status)",
  [CaseParticipantCompanyStatus.ACTIVE]:   "Active (status)",
  [CaseParticipantCompanyStatus.REJECTED]: "Rejected (status)",
  [CaseParticipantCompanyStatus.REMOVED]:  "Removed (status)",
};

const CASE_TYPE_BADGE: Record<CaseType, string> = {
  [CaseType.REQUEST]:  "bg-amber-50 text-amber-700",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-700",
  [CaseType.PROJECT]:  "bg-violet-50 text-violet-700",
};

const CASE_STATUS_PILL: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]:          "bg-slate-100 text-slate-600",
  [CaseStatus.IN_PROGRESS]:      "bg-blue-100 text-blue-700",
  [CaseStatus.REVIEW_REQUESTED]: "bg-violet-100 text-violet-700",
  [CaseStatus.COMPLETED]:        "bg-emerald-100 text-emerald-700",
  [CaseStatus.ON_HOLD]:          "bg-amber-100 text-amber-700",
  [CaseStatus.CANCELED]:         "bg-red-100 text-red-600",
  [CaseStatus.REOPENED]:         "bg-indigo-100 text-indigo-700",
};

// ── helpers ───────────────────────────────────────────────────

interface PartnerGroup {
  companyId: string;
  companyName: string;
  invitations: ParticipantCompanyInvitation[];
  activeCaseCount: number;
  latestCase: ParticipantCompanyInvitation | null;
  expanded: boolean;
}

function buildPartnerGroups(
  invitations: ParticipantCompanyInvitation[],
  isOutgoing: boolean,
): PartnerGroup[] {
  const map = new Map<string, ParticipantCompanyInvitation[]>();
  for (const inv of invitations) {
    // For outgoing (sent): group by participant company. For incoming history: group by owner company.
    const key = isOutgoing
      ? inv.participantCompany.companyId
      : inv.participantCompany.ownerCompanyId;
    const arr = map.get(key) ?? [];
    arr.push(inv);
    map.set(key, arr);
  }

  return [...map.entries()].map(([companyId, items]) => {
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.participantCompany.updatedAt).getTime() -
        new Date(a.participantCompany.updatedAt).getTime(),
    );
    return {
      companyId,
      companyName: isOutgoing
        ? (items[0].participantCompany.companyName ?? companyId)
        : items[0].participantCompany.ownerCompanyId,
      invitations: sorted,
      activeCaseCount: items.filter(
        (i) => i.participantCompany.status === CaseParticipantCompanyStatus.ACTIVE,
      ).length,
      latestCase: sorted[0] ?? null,
      expanded: false,
    };
  });
}

// ── component ─────────────────────────────────────────────────

export default function PartnersPage() {
  const router = useRouter();
  const { t } = useTranslation("ui");

  const [activeTab, setActiveTab] = useState<PartnersTab>("received");
  const [invitations, setInvitations]     = useState<ParticipantCompanyInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<ParticipantCompanyInvitation[]>([]);
  const [emailInvitations, setEmailInvitations] = useState<EmailInvitation[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [sentLoading, setSentLoading]     = useState(true);
  const [sentError, setSentError]         = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<CaseParticipantCompanyStatus | "ALL">("ALL");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── fetch ──────────────────────────────────────────────────

  const fetchReceived = async () => {
    try {
      setIsLoading(true);
      const [data, emailData] = await Promise.all([
        CaseService.getParticipantCompanyInvitations(),
        CaseService.getMyEmailInvitations(),
      ]);
      setInvitations(data);
      setEmailInvitations(emailData);
    } catch {
      // silently keep empty
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSent = async () => {
    try {
      setSentLoading(true);
      setSentError(false);
      const data = await CaseService.getSentParticipantCompanyInvitations();
      setSentInvitations(data);
    } catch {
      setSentError(true);
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    void fetchReceived();
    void fetchSent();
  }, []);

  // ── actions ────────────────────────────────────────────────

  const handleAction = async (
    inv: ParticipantCompanyInvitation,
    status: CaseParticipantCompanyStatus.ACTIVE | CaseParticipantCompanyStatus.REJECTED,
  ) => {
    const key = `${inv.participantCompany.caseId}-${status}`;
    setActionLoading(key);
    try {
      await CaseService.updateParticipantCompanyStatus(
        inv.participantCompany.caseId,
        inv.participantCompany.participantCompanyId,
        { status },
      );
      await fetchReceived();
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptEmailInvitation = async (inv: EmailInvitation) => {
    setActionLoading(inv.invitationId);
    try {
      const { caseId } = await CaseService.acceptEmailInvitation(inv.invitationId);
      router.push(`/dashboard/cases/${caseId}`);
    } catch {
      setActionLoading(null);
    }
  };

  // ── derived data ───────────────────────────────────────────

  const pending = invitations.filter(
    (inv) => inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED,
  );
  const history = invitations
    .filter((inv) => inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED)
    .sort(
      (a, b) =>
        new Date(b.participantCompany.updatedAt).getTime() -
        new Date(a.participantCompany.updatedAt).getTime(),
    );

  const partnerGroups = useMemo(() => buildPartnerGroups(history, false), [history]);

  const filteredSentGroups = useMemo(() => {
    const groups = buildPartnerGroups(sentInvitations, true);
    return groups
      .filter((g) => {
        if (search && !g.companyName.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "ALL") {
          return g.invitations.some((i) => i.participantCompany.status === statusFilter);
        }
        return true;
      })
      .map((g) => ({
        ...g,
        expanded: expandedGroups.has(g.companyId),
        invitations:
          statusFilter !== "ALL"
            ? g.invitations.filter((i) => i.participantCompany.status === statusFilter)
            : g.invitations,
      }));
  }, [sentInvitations, search, statusFilter, expandedGroups]);

  const filteredHistory = useMemo(() => {
    return history.filter((inv) => {
      const companyName = inv.participantCompany.ownerCompanyId.toLowerCase();
      if (search && !companyName.includes(search.toLowerCase())) return false;
      if (statusFilter !== "ALL" && inv.participantCompany.status !== statusFilter) return false;
      return true;
    });
  }, [history, search, statusFilter]);

  const toggleGroup = (companyId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  // ── tabs config ────────────────────────────────────────────

  const tabs: { id: PartnersTab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: "received",
      label: t("Received Invitations"),
      icon: <ArrowDownToLine size={13} />,
      count: pending.length + emailInvitations.length,
    },
    {
      id: "sent",
      label: t("Sent Invitations"),
      icon: <Send size={13} />,
      count: sentInvitations.filter(
        (i) => i.participantCompany.status === CaseParticipantCompanyStatus.INVITED,
      ).length,
    },
    {
      id: "history",
      label: t("Collaboration History"),
      icon: <Handshake size={13} />,
      count: history.length,
    },
  ];

  // ── render helpers ─────────────────────────────────────────

  const renderSearchFilter = () => (
    <div className="flex flex-col sm:flex-row gap-2 mb-5">
      <div className="relative flex-1">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search by company name")}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as CaseParticipantCompanyStatus | "ALL")}
        className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
      >
        <option value="ALL">{t("All statuses")}</option>
        {Object.values(CaseParticipantCompanyStatus).map((s) => (
          <option key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</option>
        ))}
      </select>
    </div>
  );

  const renderInvitationCard = (inv: ParticipantCompanyInvitation, showActions: boolean) => (
    <div
      key={`${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`}
      className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_TYPE_BADGE[inv.caseSummary.caseType]}`}>
            {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_STATUS_PILL[inv.caseSummary.status as CaseStatus] ?? "bg-slate-100 text-slate-600"}`}>
            {t(CASE_STATUS_LABELS[inv.caseSummary.status as CaseStatus])}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[inv.participantCompany.status]}`}>
            {t(STATUS_LABEL_KEY[inv.participantCompany.status])}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-900 truncate">{inv.caseSummary.title}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {inv.caseSummary.dueDate && (
            <span className="text-[10px] text-slate-400">
              {t("Due Date")}: {inv.caseSummary.dueDate}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {new Date(inv.participantCompany.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showActions && inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED && (
          <>
            <button
              onClick={() => handleAction(inv, CaseParticipantCompanyStatus.REJECTED)}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <XCircle size={12} />
              {t("Reject")}
            </button>
            <button
              onClick={() => handleAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
              disabled={!!actionLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <CheckCircle size={12} />
              {t("Join")}
            </button>
          </>
        )}
        <button
          onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
          title={t("Go to parent case")}
        >
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );

  const renderPartnerGroupCard = (group: PartnerGroup, isOutgoing: boolean) => (
    <div key={group.companyId} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => toggleGroup(group.companyId)}
      >
        <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Building2 size={15} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{group.companyName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-500">
              {group.invitations.length} {t("cases")}
            </span>
            {group.activeCaseCount > 0 && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {t("Active cases")} {group.activeCaseCount}
              </span>
            )}
            {group.latestCase && (
              <span className="text-[10px] text-slate-400 truncate hidden sm:block max-w-[200px]">
                {group.latestCase.caseSummary.title}
              </span>
            )}
          </div>
        </div>
        {group.expanded
          ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
      </button>
      {group.expanded && (
        <div className="border-t border-slate-100 px-4 py-1">
          {group.invitations.map((inv) => renderInvitationCard(inv, !isOutgoing))}
        </div>
      )}
    </div>
  );

  // ── main render ────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2.5 text-slate-800">
          <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
            <Handshake size={15} className="text-white" />
          </div>
          {t("Partners page title")}
        </h2>
        <p className="text-slate-600 text-sm mt-1">{t("Partners description")}</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(""); setStatusFilter("ALL"); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── RECEIVED TAB ──────────────────────────────────── */}
      {activeTab === "received" && (
        <div className="space-y-6">
          {/* Email invitations */}
          {!isLoading && emailInvitations.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Mail size={13} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-700">{t("Email Invitations (New)")}</h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  {emailInvitations.length}
                </span>
              </div>
              <div className="space-y-2">
                {emailInvitations.map((inv) => (
                  <div
                    key={inv.invitationId}
                    className="bg-white border border-indigo-100 rounded-lg p-4 flex items-start gap-4"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-md bg-indigo-50 flex items-center justify-center">
                      <Mail size={16} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{inv.caseTitle ?? t("Cases")}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t("Invited by")}: <span className="font-medium text-slate-700">{inv.ownerCompanyId}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptEmailInvitation(inv)}
                      disabled={actionLoading === inv.invitationId}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
                    >
                      <CheckCircle size={12} />
                      {t("Join")}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending invitations */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-amber-600" />
              <h3 className="text-sm font-bold text-slate-700">{t("Pending Invitations")}</h3>
              {pending.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {pending.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 flex justify-center">
                <div className="w-5 h-5 border border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              </div>
            ) : pending.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                <Handshake size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">{t("No pending invitations.")}</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                {pending.map((inv) => (
                  <div
                    key={`${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
                        <Building2 size={15} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_TYPE_BADGE[inv.caseSummary.caseType]}`}>
                            {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_STATUS_PILL[inv.caseSummary.status as CaseStatus] ?? "bg-slate-100 text-slate-600"}`}>
                            {t(CASE_STATUS_LABELS[inv.caseSummary.status as CaseStatus])}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">{inv.caseSummary.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">
                            {t("Invited by")}: <span className="font-medium text-slate-700">{inv.participantCompany.ownerCompanyId}</span>
                          </span>
                          {inv.caseSummary.dueDate && (
                            <span className="text-[10px] text-slate-400">{t("Due Date")}: {inv.caseSummary.dueDate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      <button
                        onClick={() => handleAction(inv, CaseParticipantCompanyStatus.REJECTED)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        <XCircle size={12} />
                        {t("Reject")}
                      </button>
                      <button
                        onClick={() => handleAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                      >
                        <CheckCircle size={12} />
                        {t("Join")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── SENT TAB ──────────────────────────────────────── */}
      {activeTab === "sent" && (
        <div>
          {renderSearchFilter()}

          {sentLoading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 flex justify-center">
              <div className="w-5 h-5 border border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : sentError ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <p className="text-sm text-red-500">{t("Failed to load sent invitations.")}</p>
            </div>
          ) : filteredSentGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
              <Send size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {search || statusFilter !== "ALL"
                  ? t("No results found.")
                  : t("No sent invitations.")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSentGroups.map((group) => renderPartnerGroupCard(group, true))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────── */}
      {activeTab === "history" && (
        <div>
          {renderSearchFilter()}

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 flex justify-center">
              <div className="w-5 h-5 border border-slate-200 border-t-slate-600 rounded-full animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
              <Handshake size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {search || statusFilter !== "ALL"
                  ? t("No results found.")
                  : t("No collaboration history.")}
              </p>
            </div>
          ) : (
            <>
              {/* Partner group cards */}
              {!search && statusFilter === "ALL" && partnerGroups.length > 0 && (
                <div className="mb-5 space-y-2">
                  {partnerGroups.map((group) => renderPartnerGroupCard(group, false))}
                </div>
              )}

              {/* Flat table (shown when filtering or as detail view) */}
              {(search || statusFilter !== "ALL") && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left">
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t("Case (header)")}</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-24">{t("Type")}</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Status")}</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-24">{t("Due Date")}</th>
                        <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Participation (header)")}</th>
                        <th className="px-4 py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((inv) => (
                        <tr
                          key={`${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 truncate max-w-xs">{inv.caseSummary.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{inv.participantCompany.ownerCompanyId}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_TYPE_BADGE[inv.caseSummary.caseType]}`}>
                              {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CASE_STATUS_PILL[inv.caseSummary.status as CaseStatus] ?? "bg-slate-100 text-slate-600"}`}>
                              {t(CASE_STATUS_LABELS[inv.caseSummary.status as CaseStatus])}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {inv.caseSummary.dueDate ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_BADGE[inv.participantCompany.status]}`}>
                              {t(STATUS_LABEL_KEY[inv.participantCompany.status])}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => router.push(`/dashboard/cases/${inv.caseSummary.caseId}`)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              <ExternalLink size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

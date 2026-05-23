"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, Search, X, Building2, Plus, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CaseDetail,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseParticipantCompanyStatus,
  CaseService,
  CompanySearchResult,
} from "@task/core";

const PARTICIPANT_STATUS_STYLES: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "bg-amber-50 text-amber-700 border border-amber-200",
  [CaseParticipantCompanyStatus.ACTIVE]: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  [CaseParticipantCompanyStatus.REJECTED]: "bg-red-50 text-red-600 border border-red-200",
  [CaseParticipantCompanyStatus.REMOVED]: "bg-slate-50 text-slate-500 border border-slate-200",
};

const PARTICIPANT_STATUS_KEY: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "Invited (status)",
  [CaseParticipantCompanyStatus.ACTIVE]: "Active (status)",
  [CaseParticipantCompanyStatus.REJECTED]: "Rejected (status)",
  [CaseParticipantCompanyStatus.REMOVED]: "Removed (status)",
};

export interface CaseParticipantCompanySectionProps {
  caseId: string;
  caseDetail: CaseDetail;
  participantCompanies: CaseParticipantCompany[];
  isParticipantsLoading: boolean;
  participantsError: string | null;
  currentUserId: string | null;
  onRefresh: () => Promise<void>;
}

export const CaseParticipantCompanySection = ({
  caseId,
  caseDetail,
  participantCompanies,
  isParticipantsLoading,
  participantsError,
  currentUserId,
  onRefresh,
}: CaseParticipantCompanySectionProps) => {
  const { t } = useTranslation("ui");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteTab, setInviteTab] = useState<"search" | "email">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanySearchResult | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canInvite =
    !!currentUserId &&
    (caseDetail.creatorId === currentUserId ||
      (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId));

  useEffect(() => {
    if (!showInviteForm) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCompany(null);
      setEmailInput("");
      setInviteError(null);
      setInviteTab("search");
    }
  }, [showInviteForm]);

  useEffect(() => {
    if (selectedCompany) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await CaseService.searchCompanies(searchQuery.trim());
        const alreadyInvited = new Set(participantCompanies.map((p) => p.companyId));
        setSearchResults(results.filter((r) => !alreadyInvited.has(r.companyId)));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery, selectedCompany, participantCompanies]);

  const handleSelect = (company: CompanySearchResult) => {
    setSelectedCompany(company);
    setSearchQuery(company.name);
    setSearchResults([]);
  };

  const handleInviteBySearch = async () => {
    if (!selectedCompany) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      await CaseService.inviteParticipantCompany(caseId, { companyId: selectedCompany.companyId });
      setShowInviteForm(false);
      await onRefresh();
    } catch {
      setInviteError(t("Failed to invite. Please try again."));
    } finally {
      setIsInviting(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!emailInput.trim()) {
      setInviteError(t("Please enter an email address."));
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    try {
      await CaseService.inviteCompanyByEmail({ email: emailInput.trim(), caseId });
      setShowInviteForm(false);
      await onRefresh();
    } catch {
      setInviteError(t("Failed to invite. Please check the email address."));
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Building2 size={14} className="text-slate-500" />
          {t("Participant Companies")}
        </h3>
        {canInvite && !showInviteForm && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Plus size={12} />
            {t("Invite")}
          </button>
        )}
      </div>

      {showInviteForm && (
        <div className="mb-4 p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => { setInviteTab("search"); setInviteError(null); }}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${inviteTab === "search" ? "bg-white border border-slate-300 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Search size={11} /> {t("Company Search")}
              </button>
              <button
                onClick={() => { setInviteTab("email"); setInviteError(null); }}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${inviteTab === "email" ? "bg-white border border-slate-300 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Mail size={11} /> {t("Email Invitation")}
              </button>
            </div>
            <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>

          {inviteError && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-md text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteTab === "search" ? (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedCompany(null); }}
                  placeholder={t("Search by company name...")}
                  className="w-full border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
                {isSearching && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {searchResults.length > 0 && !selectedCompany && (
                <div className="border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
                  {searchResults.map((company) => (
                    <button
                      key={company.companyId}
                      onClick={() => handleSelect(company)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-800">{company.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{company.companyId}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectedCompany && (
                <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-md">
                  <Building2 size={13} className="text-indigo-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-indigo-900 truncate">{selectedCompany.name}</p>
                  </div>
                  <button onClick={() => { setSelectedCompany(null); setSearchQuery(""); }} className="text-indigo-400 hover:text-indigo-600">
                    <X size={12} />
                  </button>
                </div>
              )}
              <button
                onClick={handleInviteBySearch}
                disabled={!selectedCompany || isInviting}
                className="w-full text-xs font-semibold py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isInviting ? t("Inviting...") : t("Invite Company")}
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-500">{t("Unregistered company email invitation")}</p>
              <div className="relative">
                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
              <button
                onClick={handleInviteByEmail}
                disabled={!emailInput.trim() || isInviting}
                className="w-full text-xs font-semibold py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isInviting ? t("Inviting...") : t("Send Invitation Email")}
              </button>
            </>
          )}
        </div>
      )}

      {isParticipantsLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border border-slate-200 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : participantsError ? (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-md text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{participantsError}</span>
        </div>
      ) : participantCompanies.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">{t("No participant companies yet.")}</p>
      ) : (
        <ul className="space-y-2">
          {participantCompanies.map((p) => (
            <li key={p.companyId} className="flex items-center justify-between border border-slate-100 rounded-md p-3 bg-slate-50/30">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-slate-800 block truncate">{p.companyName ?? p.companyId}</span>
                <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">{p.companyId}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ml-3 ${PARTICIPANT_STATUS_STYLES[p.status]}`}>
                {t(PARTICIPANT_STATUS_KEY[p.status])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

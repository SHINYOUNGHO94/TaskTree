"use client";

import { useEffect, useState } from "react";
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
import { Handshake, Building2, CheckCircle, XCircle, Clock, ExternalLink, Mail } from "lucide-react";
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from "../../../components/dashboard/caseLabels";

const STATUS_BADGE: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "bg-amber-50 text-amber-700 border border-amber-200",
  [CaseParticipantCompanyStatus.ACTIVE]: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  [CaseParticipantCompanyStatus.REJECTED]: "bg-red-50 text-red-600 border border-red-200",
  [CaseParticipantCompanyStatus.REMOVED]: "bg-slate-100 text-slate-500 border border-slate-200",
};

const STATUS_LABEL_KEY: Record<CaseParticipantCompanyStatus, string> = {
  [CaseParticipantCompanyStatus.INVITED]: "Invited (status)",
  [CaseParticipantCompanyStatus.ACTIVE]: "Active (status)",
  [CaseParticipantCompanyStatus.REJECTED]: "Rejected (status)",
  [CaseParticipantCompanyStatus.REMOVED]: "Removed (status)",
};

const CASE_TYPE_BADGE: Record<CaseType, string> = {
  [CaseType.REQUEST]: "bg-amber-50 text-amber-700",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-700",
  [CaseType.PROJECT]: "bg-violet-50 text-violet-700",
};

export default function PartnersPage() {
  const router = useRouter();
  const { t } = useTranslation("ui");
  const [invitations, setInvitations] = useState<ParticipantCompanyInvitation[]>([]);
  const [emailInvitations, setEmailInvitations] = useState<EmailInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      const [data, emailData] = await Promise.all([
        CaseService.getParticipantCompanyInvitations(),
        CaseService.getMyEmailInvitations(),
      ]);
      setInvitations(data);
      setEmailInvitations(emailData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

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
      await fetchInvitations();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptEmailInvitation = async (inv: EmailInvitation) => {
    setActionLoading(inv.invitationId);
    try {
      const { caseId } = await CaseService.acceptEmailInvitation(inv.invitationId);
      router.push(`/dashboard/cases/${caseId}`);
    } catch (err) {
      console.error(err);
      setActionLoading(null);
    }
  };

  const pending = invitations.filter(
    (inv) => inv.participantCompany.status === CaseParticipantCompanyStatus.INVITED,
  );
  const history = invitations.filter(
    (inv) => inv.participantCompany.status !== CaseParticipantCompanyStatus.INVITED,
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold flex items-center gap-2.5 text-slate-800">
          <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
            <Handshake size={15} className="text-white" />
          </div>
          {t("Partners page title")}
        </h2>
        <p className="text-slate-600 text-sm mt-1">{t("Partners description")}</p>
      </div>

      {/* Email invitations */}
      {!isLoading && emailInvitations.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={14} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-700">{t("Email Invitations (New)")}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              {emailInvitations.length}
            </span>
          </div>
          <div className="space-y-3">
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
                  <CheckCircle size={13} />
                  {t("Join")}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending invitations */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-amber-600" />
          <h3 className="text-sm font-bold text-slate-700">{t("Pending Invitations")}</h3>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
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
            <p className="text-sm text-slate-400">{t("No pending invitations.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((inv) => (
              <div
                key={`${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`}
                className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
                  <Building2 size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CASE_TYPE_BADGE[inv.caseSummary.caseType]}`}>
                      {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])}
                    </span>
                    <span className="text-xs text-slate-400">{t(CASE_STATUS_LABELS[inv.caseSummary.status as CaseStatus])}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{inv.caseSummary.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t("Invited by")}: <span className="font-medium text-slate-700">{inv.participantCompany.ownerCompanyId}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    {new Date(inv.participantCompany.createdAt).toLocaleDateString()}
                  </p>
                </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    onClick={() => handleAction(inv, CaseParticipantCompanyStatus.REJECTED)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <XCircle size={13} />
                    {t("Reject")}
                  </button>
                  <button
                    onClick={() => handleAction(inv, CaseParticipantCompanyStatus.ACTIVE)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <CheckCircle size={13} />
                    {t("Join")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {!isLoading && history.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-700">{t("Collaboration History")}</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t("Case (header)")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Type")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-24">{t("Status")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-28">{t("Participation (header)")}</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wide w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((inv) => (
                  <tr
                    key={`${inv.participantCompany.caseId}-${inv.participantCompany.companyId}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-xs">{inv.caseSummary.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{inv.participantCompany.ownerCompanyId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CASE_TYPE_BADGE[inv.caseSummary.caseType]}`}>
                        {t(CASE_TYPE_LABELS[inv.caseSummary.caseType])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {t(CASE_STATUS_LABELS[inv.caseSummary.status as CaseStatus])}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[inv.participantCompany.status]}`}>
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
        </section>
      )}
    </div>
  );
}

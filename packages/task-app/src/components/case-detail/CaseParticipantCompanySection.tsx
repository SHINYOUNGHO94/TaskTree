"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  CaseDetail,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseParticipantCompanyStatus,
  CaseService,
} from "@task/core";

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

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

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
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canInvite =
    !!currentUserId &&
    (caseDetail.creatorId === currentUserId ||
      (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId));

  const handleInviteCompany = async () => {
    if (!inviteCompanyId.trim()) {
      setInviteError("会社IDを入力してください。");
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    try {
      await CaseService.inviteParticipantCompany(caseId, { companyId: inviteCompanyId.trim() });
      setInviteCompanyId("");
      setShowInviteForm(false);
      await onRefresh();
    } catch {
      setInviteError("招待に失敗しました。会社IDを確認してください。");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <h3 className="text-sm font-bold text-gray-800">参加会社</h3>
        {canInvite && (
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
  );
};

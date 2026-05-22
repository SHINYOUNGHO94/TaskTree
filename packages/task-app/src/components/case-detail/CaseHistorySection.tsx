"use client";

import { AlertCircle } from "lucide-react";
import { CaseHistoryAction, CaseHistoryEntry } from "@task/core";
import { resolveDisplayName } from "../dashboard/caseLabels";

const HISTORY_ACTION_LABELS: Record<CaseHistoryAction, string> = {
  [CaseHistoryAction.CASE_CREATED]: "案件作成",
  [CaseHistoryAction.STATUS_CHANGED]: "ステータス変更",
  [CaseHistoryAction.TASK_CREATED]: "作業追加",
  [CaseHistoryAction.TASK_UPDATED]: "作業更新",
  [CaseHistoryAction.TASK_STATUS_CHANGED]: "作業ステータス変更",
  [CaseHistoryAction.TASK_ASSIGNEE_CHANGED]: "作業担当者変更",
  [CaseHistoryAction.TASK_DELETED]: "作業削除",
  [CaseHistoryAction.CLAIM_REQUESTED]: "担当希望",
  [CaseHistoryAction.CLAIM_APPROVED]: "担当承認",
  [CaseHistoryAction.CLAIM_REJECTED]: "担当却下",
  [CaseHistoryAction.CHILD_CASE_CREATED]: "子案件追加",
  [CaseHistoryAction.PARTICIPANT_COMPANY_INVITED]: "外部会社招待",
  [CaseHistoryAction.PARTICIPANT_COMPANY_ACCEPTED]: "外部会社参加承認",
  [CaseHistoryAction.PARTICIPANT_COMPANY_REJECTED]: "外部会社参加拒否",
};

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CaseHistorySectionProps {
  history: CaseHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  userMap: Map<string, { name: string; email: string }>;
}

export const CaseHistorySection = ({
  history,
  isLoading,
  error,
  userMap,
}: CaseHistorySectionProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">履歴</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <ErrorAlert message={error} />
      ) : history.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">履歴はまだありません。</p>
      ) : (
        <ul className="relative pl-3.5 border-l-2 border-gray-100 space-y-4 my-2">
          {history.map((entry) => (
            <li key={entry.historyId} className="relative group">
              <div className="absolute left-[-20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50/50" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(entry.createdAt).toLocaleString("ja-JP")}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {resolveDisplayName(entry.actorId, userMap)}
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
  );
};

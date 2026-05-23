"use client";

import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CaseHistoryAction, CaseHistoryEntry } from "@task/core";
import { resolveDisplayName } from "../dashboard/caseLabels";

const HISTORY_ACTION_KEY: Record<CaseHistoryAction, string> = {
  [CaseHistoryAction.CASE_CREATED]: "Case Created",
  [CaseHistoryAction.STATUS_CHANGED]: "Status Changed",
  [CaseHistoryAction.TASK_CREATED]: "Task Added",
  [CaseHistoryAction.TASK_UPDATED]: "Task Updated",
  [CaseHistoryAction.TASK_STATUS_CHANGED]: "Task Status Changed",
  [CaseHistoryAction.TASK_ASSIGNEE_CHANGED]: "Task Assignee Changed",
  [CaseHistoryAction.TASK_DELETED]: "Task Deleted",
  [CaseHistoryAction.CLAIM_REQUESTED]: "Claim Requested",
  [CaseHistoryAction.CLAIM_APPROVED]: "Claim Approved",
  [CaseHistoryAction.CLAIM_REJECTED]: "Claim Rejected",
  [CaseHistoryAction.CHILD_CASE_CREATED]: "Sub-case Added",
  [CaseHistoryAction.PARTICIPANT_COMPANY_INVITED]: "External Company Invited",
  [CaseHistoryAction.PARTICIPANT_COMPANY_ACCEPTED]: "External Company Accepted",
  [CaseHistoryAction.PARTICIPANT_COMPANY_REJECTED]: "External Company Rejected",
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
  const { t } = useTranslation("ui");

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4">{t("History")}</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <ErrorAlert message={error} />
      ) : history.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">{t("No history yet.")}</p>
      ) : (
        <ul className="relative pl-3.5 border-l-2 border-gray-100 space-y-4 my-2">
          {history.map((entry) => (
            <li key={entry.historyId} className="relative group">
              <div className="absolute left-[-20.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-4 ring-blue-50/50" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-400 font-medium">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {resolveDisplayName(entry.actorId, userMap)}
                </span>
                <span className="text-xs font-semibold text-gray-700">
                  {t(HISTORY_ACTION_KEY[entry.action])}
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

"use client";

import { useState } from "react";
import { AlertCircle, Calendar, CornerDownRight } from "lucide-react";
import {
  CaseDetail,
  CaseOwnerType,
  CaseStatus,
  CaseType,
  UserProfile,
} from "@task/core";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "../dashboard/caseLabels";
import { canManageCaseOwner } from "./caseDetailPermissions";
import { CreateChildCaseForm } from "./CreateChildCaseForm";

const STATUS_STYLES: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: "bg-gray-100 text-gray-700 border border-gray-200",
  [CaseStatus.IN_PROGRESS]: "bg-blue-50 text-blue-700 border border-blue-100",
  [CaseStatus.REVIEW_REQUESTED]: "bg-purple-50 text-purple-700 border border-purple-100",
  [CaseStatus.COMPLETED]: "bg-green-50 text-green-700 border border-green-100",
  [CaseStatus.ON_HOLD]: "bg-yellow-50 text-yellow-700 border border-yellow-100",
  [CaseStatus.CANCELED]: "bg-red-50 text-red-700 border border-red-100",
  [CaseStatus.REOPENED]: "bg-orange-50 text-orange-700 border border-orange-100",
};

const CASE_TYPE_STYLES: Record<CaseType, string> = {
  [CaseType.REQUEST]: "bg-orange-50 text-orange-700 border border-orange-100",
  [CaseType.STANDARD]: "bg-blue-50 text-blue-700 border border-blue-100",
  [CaseType.PROJECT]: "bg-purple-50 text-purple-700 border border-purple-100",
};

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CaseChildCasesSectionProps {
  caseDetail: CaseDetail;
  currentUserId: string | null;
  currentProfile: UserProfile | null;
  childCases: CaseDetail[];
  isChildCasesLoading: boolean;
  childCasesError: string | null;
  requestChildrenByStandard: Record<string, CaseDetail[]>;
  nestedChildCasesError: string | null;
  isNestedLoading: boolean;
  onCreated: () => Promise<void>;
  onNavigate: (caseId: string) => void;
}

export const CaseChildCasesSection = ({
  caseDetail,
  currentUserId,
  currentProfile,
  childCases,
  isChildCasesLoading,
  childCasesError,
  requestChildrenByStandard,
  nestedChildCasesError,
  isNestedLoading,
  onCreated,
  onNavigate,
}: CaseChildCasesSectionProps) => {
  const [showChildCaseForm, setShowChildCaseForm] = useState(false);

  const canCreate =
    (caseDetail.caseType === CaseType.STANDARD || caseDetail.caseType === CaseType.PROJECT) &&
    !!currentUserId &&
    !!currentProfile &&
    (caseDetail.creatorId === currentUserId ||
      (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId) ||
      canManageCaseOwner(currentProfile, caseDetail));

  const handleCreated = async () => {
    await onCreated();
    setShowChildCaseForm(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">子案件</h3>
          <p className="text-xs text-gray-400 mt-0.5">関連するサブ案件の階層構造</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowChildCaseForm((v) => !v)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            {showChildCaseForm
              ? "キャンセル"
              : caseDetail.caseType === CaseType.PROJECT
                ? "+ 標準案件を作成"
                : "+ 依頼案件を作成"}
          </button>
        )}
      </div>

      {showChildCaseForm && currentProfile && (
        <CreateChildCaseForm
          caseId={caseDetail.caseId}
          parentCaseType={caseDetail.caseType}
          currentProfile={currentProfile}
          onCreated={handleCreated}
          onCancel={() => setShowChildCaseForm(false)}
        />
      )}

      <div className="p-6">
        {isChildCasesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : childCasesError ? (
          <ErrorAlert message={childCasesError} />
        ) : childCases.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-sm text-gray-400">子案件はまだありません。</p>
          </div>
        ) : caseDetail.caseType === CaseType.PROJECT ? (
          <>
            {nestedChildCasesError && <ErrorAlert message={nestedChildCasesError} />}
            <ul className="space-y-4">
              {childCases.map((standardChild) => (
                <li key={standardChild.caseId} className="border border-blue-100 rounded-xl overflow-hidden shadow-sm">
                  <div
                    onClick={() => onNavigate(standardChild.caseId)}
                    className="flex items-center gap-3 p-4 bg-blue-50/20 hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[standardChild.status]}`}>
                      {CASE_STATUS_LABELS[standardChild.status]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-blue-100 text-blue-700 border border-blue-200">
                      {CASE_TYPE_LABELS[CaseType.STANDARD]}
                    </span>
                    <span className="text-sm font-bold text-gray-800 flex-1 truncate">{standardChild.title}</span>
                    {standardChild.dueDate && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                        <Calendar size={12} />
                        {standardChild.dueDate}
                      </span>
                    )}
                  </div>
                  {isNestedLoading ? (
                    <div className="px-6 py-4 flex items-center gap-2 border-t border-gray-50">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                      <span className="text-xs text-gray-400">ロード中...</span>
                    </div>
                  ) : (requestChildrenByStandard[standardChild.caseId] ?? []).length > 0 ? (
                    <ul className="divide-y divide-gray-50 border-t border-gray-50 bg-gray-50/30">
                      {(requestChildrenByStandard[standardChild.caseId] ?? []).map((requestChild) => (
                        <li
                          key={requestChild.caseId}
                          onClick={() => onNavigate(requestChild.caseId)}
                          className="flex items-center gap-3 p-3 pl-8 hover:bg-gray-50 transition-colors cursor-pointer group"
                        >
                          <CornerDownRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[requestChild.status]}`}>
                            {CASE_STATUS_LABELS[requestChild.status]}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-orange-100 text-orange-700 border border-orange-200">
                            {CASE_TYPE_LABELS[CaseType.REQUEST]}
                          </span>
                          <span className="text-sm text-gray-700 flex-1 truncate">{requestChild.title}</span>
                          {requestChild.dueDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                              <Calendar size={12} />
                              {requestChild.dueDate}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="space-y-2.5">
            {childCases.map((child) => (
              <li
                key={child.caseId}
                onClick={() => onNavigate(child.caseId)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all cursor-pointer shadow-sm"
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLES[child.status]}`}>
                  {CASE_STATUS_LABELS[child.status]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${CASE_TYPE_STYLES[child.caseType]}`}>
                  {CASE_TYPE_LABELS[child.caseType]}
                </span>
                <span className="text-sm font-bold text-gray-800 flex-1 truncate">{child.title}</span>
                {child.dueDate && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                    <Calendar size={12} />
                    {child.dueDate}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

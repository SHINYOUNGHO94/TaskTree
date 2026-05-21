import { CaseDetail, CaseStatus } from "@task/core";
import { CaseCard } from "./CaseCard";

interface CaseBoardViewProps {
  cases: CaseDetail[];
  onCaseClick: (caseId: string) => void;
}

const BOARD_COLUMNS: { status: CaseStatus; label: string; headerClass: string }[] = [
  { status: CaseStatus.IN_PROGRESS, label: "対応中", headerClass: "bg-blue-50 text-blue-700" },
  { status: CaseStatus.REVIEW_REQUESTED, label: "レビュー依頼", headerClass: "bg-purple-50 text-purple-700" },
  { status: CaseStatus.WAITING, label: "待機中", headerClass: "bg-gray-100 text-gray-700" },
  { status: CaseStatus.REOPENED, label: "再開", headerClass: "bg-indigo-50 text-indigo-700" },
  { status: CaseStatus.ON_HOLD, label: "保留", headerClass: "bg-amber-50 text-amber-700" },
  { status: CaseStatus.COMPLETED, label: "完了", headerClass: "bg-green-50 text-green-700" },
  { status: CaseStatus.CANCELED, label: "キャンセル", headerClass: "bg-red-50 text-red-700" },
];

export const CaseBoardView: React.FC<CaseBoardViewProps> = ({ cases, onCaseClick }) => {
  const byStatus = (status: CaseStatus) => cases.filter((c) => c.status === status);

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {BOARD_COLUMNS.map(({ status, label, headerClass }) => {
        const column = byStatus(status);
        return (
          <div key={status} className="min-w-[220px]">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${headerClass}`}>
              <span className="text-xs font-bold">{label}</span>
              <span className="ml-auto text-xs font-normal opacity-70">{column.length}</span>
            </div>
            <div className="space-y-3">
              {column.length === 0 ? (
                <div className="py-6 text-center text-gray-300 text-xs border border-dashed border-gray-200 rounded-xl">
                  なし
                </div>
              ) : (
                column.map((c) => (
                  <CaseCard key={c.caseId} caseDetail={c} onClick={onCaseClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

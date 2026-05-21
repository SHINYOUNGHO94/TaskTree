import { CaseDetail, CaseStatus } from "@task/core";
import { CaseCard } from "./CaseCard";

interface CaseBoardViewProps {
  cases: CaseDetail[];
  onCaseClick: (caseId: string) => void;
}

const BOARD_COLUMNS: { status: CaseStatus; label: string; headerClass: string }[] = [
  { status: CaseStatus.IN_PROGRESS, label: "対応中", headerClass: "bg-sky-50 text-sky-700 border-sky-100" },
  { status: CaseStatus.REVIEW_REQUESTED, label: "レビュー依頼", headerClass: "bg-purple-50 text-purple-700 border-purple-100" },
  { status: CaseStatus.WAITING, label: "待機中", headerClass: "bg-gray-50 text-gray-600 border-gray-200/60" },
  { status: CaseStatus.REOPENED, label: "再開", headerClass: "bg-orange-50 text-orange-700 border-orange-200/60" },
  { status: CaseStatus.ON_HOLD, label: "保留", headerClass: "bg-amber-50 text-amber-700 border-amber-200/60" },
  { status: CaseStatus.COMPLETED, label: "完了", headerClass: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { status: CaseStatus.CANCELED, label: "キャンセル", headerClass: "bg-rose-50 text-rose-700 border-rose-100" },
];

export const CaseBoardView: React.FC<CaseBoardViewProps> = ({ cases, onCaseClick }) => {
  const byStatus = (status: CaseStatus) => cases.filter((c) => c.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200">
      {BOARD_COLUMNS.map(({ status, label, headerClass }) => {
        const column = byStatus(status);
        return (
          <div key={status} className="flex-1 min-w-[280px] max-w-[320px] bg-gray-50/40 p-3.5 rounded-2xl border border-gray-100">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 border ${headerClass}`}>
              <span className="text-xs font-bold tracking-wider">{label}</span>
              <span className="ml-auto text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-gray-200/60 text-gray-500">
                {column.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {column.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs border border-dashed border-gray-200 bg-white rounded-2xl">
                  案件はありません
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

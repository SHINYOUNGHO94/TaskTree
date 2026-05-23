import { CaseDetail, CaseStatus } from "@task/core";
import { CaseCard } from "./CaseCard";

interface CaseBoardViewProps {
  cases: CaseDetail[];
  onCaseClick: (caseId: string) => void;
}

const BOARD_COLUMNS: { status: CaseStatus; label: string; accentClass: string; countClass: string }[] = [
  { status: CaseStatus.IN_PROGRESS,       label: "対応中",      accentClass: "from-sky-500 to-blue-600",       countClass: "bg-sky-100 text-sky-700" },
  { status: CaseStatus.REVIEW_REQUESTED,  label: "レビュー依頼", accentClass: "from-violet-500 to-purple-600",  countClass: "bg-violet-100 text-violet-700" },
  { status: CaseStatus.WAITING,           label: "待機中",      accentClass: "from-slate-400 to-slate-500",    countClass: "bg-slate-100 text-slate-600" },
  { status: CaseStatus.REOPENED,          label: "再開",        accentClass: "from-orange-400 to-amber-500",   countClass: "bg-orange-100 text-orange-700" },
  { status: CaseStatus.ON_HOLD,           label: "保留",        accentClass: "from-amber-400 to-yellow-500",   countClass: "bg-amber-100 text-amber-700" },
  { status: CaseStatus.COMPLETED,         label: "完了",        accentClass: "from-emerald-500 to-teal-600",   countClass: "bg-emerald-100 text-emerald-700" },
  { status: CaseStatus.CANCELED,          label: "キャンセル",  accentClass: "from-rose-500 to-red-600",       countClass: "bg-rose-100 text-rose-700" },
];

export const CaseBoardView: React.FC<CaseBoardViewProps> = ({ cases, onCaseClick }) => {
  const byStatus = (status: CaseStatus) => cases.filter((c) => c.status === status);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map(({ status, label, accentClass, countClass }) => {
        const column = byStatus(status);
        return (
          <div key={status} className="flex-1 min-w-[280px] max-w-[320px] bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* Column header with gradient strip */}
            <div className={`h-1 w-full bg-gradient-to-r ${accentClass}`} />
            <div className="p-3.5">
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-xs font-bold text-slate-700 tracking-wide">{label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${countClass}`}>
                  {column.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-0.5">
                {column.length === 0 ? (
                  <div className="py-10 text-center text-slate-300 text-xs border border-dashed border-slate-200 rounded-md bg-slate-50/40">
                    案件はありません
                  </div>
                ) : (
                  column.map((c) => (
                    <CaseCard key={c.caseId} caseDetail={c} onClick={onCaseClick} />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

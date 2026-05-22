import { CaseDetail, CaseStatus, CaseType } from '@task/core';
import { Calendar } from 'lucide-react';
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from './caseLabels';

interface CaseCardProps {
  caseDetail: CaseDetail;
  onClick?: (caseId: string) => void;
}

const caseTypeStyles: Record<CaseType, string> = {
  [CaseType.REQUEST]: 'bg-amber-50/80 text-amber-700 border border-amber-100/80',
  [CaseType.STANDARD]: 'bg-blue-50/80 text-blue-700 border border-blue-100/80',
  [CaseType.PROJECT]: 'bg-purple-50/80 text-purple-700 border border-purple-100/80',
};

const statusStyles: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: 'bg-gray-50 text-gray-600 border border-gray-200/60',
  [CaseStatus.IN_PROGRESS]: 'bg-sky-50 text-sky-700 border border-sky-100',
  [CaseStatus.REVIEW_REQUESTED]: 'bg-purple-50 text-purple-700 border border-purple-100',
  [CaseStatus.COMPLETED]: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  [CaseStatus.ON_HOLD]: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  [CaseStatus.CANCELED]: 'bg-rose-50 text-rose-700 border border-rose-100',
  [CaseStatus.REOPENED]: 'bg-orange-50 text-orange-700 border border-orange-200/60',
};

export const CaseCard: React.FC<CaseCardProps> = ({ caseDetail, onClick }) => {
  const createdDate = new Date(caseDetail.createdAt).toLocaleDateString('ja-JP');

  return (
    <button
      type="button"
      onClick={() => onClick?.(caseDetail.caseId)}
      className={`w-full text-left bg-white border border-gray-200/70 p-5 rounded-xl hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 flex flex-col justify-between min-h-[170px] ${onClick ? ' cursor-pointer' : ''}`}
    >
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${caseTypeStyles[caseDetail.caseType]}`}>
            {CASE_TYPE_LABELS[caseDetail.caseType]}
          </span>
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${statusStyles[caseDetail.status]}`}>
            {CASE_STATUS_LABELS[caseDetail.status]}
          </span>
        </div>

        <h3 className="text-sm font-bold text-gray-900 mb-1.5 line-clamp-2 leading-snug">
          {caseDetail.title}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
          {caseDetail.description}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-gray-100 w-full mt-auto">
        <div className="flex items-center gap-1 font-medium text-gray-500">
          <Calendar size={12} className="text-gray-400" />
          <span>{caseDetail.dueDate ?? '期限なし'}</span>
        </div>
        <span>{createdDate}</span>
      </div>
    </button>
  );
};

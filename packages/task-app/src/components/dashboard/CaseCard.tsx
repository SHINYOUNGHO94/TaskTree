import { useTranslation } from 'react-i18next';
import { CaseDetail, CaseStatus, CaseType } from '@task/core';
import { Calendar, ArrowRight } from 'lucide-react';
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from './caseLabels';

interface CaseCardProps {
  caseDetail: CaseDetail;
  onClick?: (caseId: string) => void;
}

const caseTypeStyles: Record<CaseType, { badge: string; accent: string }> = {
  [CaseType.REQUEST]: {
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
    accent: 'from-amber-400 to-orange-500',
  },
  [CaseType.STANDARD]: {
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80',
    accent: 'from-blue-400 to-sky-500',
  },
  [CaseType.PROJECT]: {
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/80',
    accent: 'from-violet-500 to-purple-600',
  },
};

const statusStyles: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]:           'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80',
  [CaseStatus.IN_PROGRESS]:       'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80',
  [CaseStatus.REVIEW_REQUESTED]:  'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
  [CaseStatus.COMPLETED]:         'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80',
  [CaseStatus.ON_HOLD]:           'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
  [CaseStatus.CANCELED]:          'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80',
  [CaseStatus.REOPENED]:          'bg-orange-50 text-orange-700 ring-1 ring-orange-200/80',
};

export const CaseCard: React.FC<CaseCardProps> = ({ caseDetail, onClick }) => {
  const { t } = useTranslation('ui');
  const createdDate = new Date(caseDetail.createdAt).toLocaleDateString();
  const { badge, accent } = caseTypeStyles[caseDetail.caseType];

  return (
    <button
      type="button"
      onClick={() => onClick?.(caseDetail.caseId)}
      className={`group w-full text-left bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50/30 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:ring-offset-1 flex flex-col overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Type accent strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${accent} flex-shrink-0`} />

      <div className="flex flex-col flex-1 p-5">
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className={`text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${badge}`}>
              {t(CASE_TYPE_LABELS[caseDetail.caseType])}
            </span>
            <span className={`text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${statusStyles[caseDetail.status]}`}>
              {t(CASE_STATUS_LABELS[caseDetail.status])}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-800 mb-1.5 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors duration-200">
            {caseDetail.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
            {caseDetail.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 w-full mt-auto">
          <div className="flex items-center gap-1.5 font-medium text-slate-500">
            <Calendar size={11} className="text-slate-400" />
            <span>{caseDetail.dueDate ?? t('No due date')}</span>
          </div>
          <div className="flex items-center gap-1 group-hover:text-indigo-500 transition-colors duration-200">
            <span>{createdDate}</span>
            <ArrowRight size={11} className="md:opacity-0 md:group-hover:opacity-100 md:-translate-x-1 md:group-hover:translate-x-0 transition-all duration-200" />
          </div>
        </div>
      </div>
    </button>
  );
};

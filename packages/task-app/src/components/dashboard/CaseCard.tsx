import { useTranslation } from 'react-i18next';
import { CaseDeliveryType, CaseDetail, CaseOwnerType, CaseStatus, CaseType } from '@task/core';
import { Calendar, ArrowRight, Pencil, GitBranch } from 'lucide-react';
import { CASE_DELIVERY_TYPE_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from './caseLabels';

interface CaseCardProps {
  caseDetail: CaseDetail;
  onClick?: (caseId: string) => void;
  onEdit?: (caseDetail: CaseDetail) => void;
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

const ownerTypeLabel: Record<CaseOwnerType, string> = {
  [CaseOwnerType.USER]:       'User',
  [CaseOwnerType.TEAM]:       'Team',
  [CaseOwnerType.DEPARTMENT]: 'Dept',
  [CaseOwnerType.DIVISION]:   'Div',
  [CaseOwnerType.COMPANY]:    'Co.',
};

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dueDateStatus(dueDate: string | null): 'overdue' | 'soon' | 'normal' | 'none' {
  if (!dueDate) return 'none';
  const today = localDateStr();
  if (dueDate < today) return 'overdue';
  if (dueDate <= addDays(today, 3)) return 'soon';
  return 'normal';
}

export const CaseCard: React.FC<CaseCardProps> = ({ caseDetail, onClick, onEdit }) => {
  const { t } = useTranslation('ui');
  const createdDate = new Date(caseDetail.createdAt).toLocaleDateString();
  const { badge, accent } = caseTypeStyles[caseDetail.caseType];
  const ddStatus = dueDateStatus(caseDetail.dueDate);

  const dueDateClass =
    ddStatus === 'overdue' ? 'text-rose-600 font-semibold' :
    ddStatus === 'soon'    ? 'text-amber-600 font-semibold' :
    'text-slate-500';

  const dueDateLabel =
    ddStatus === 'overdue' ? `⚠ ${caseDetail.dueDate}` :
    ddStatus === 'soon'    ? `⏰ ${caseDetail.dueDate}` :
    caseDetail.dueDate ?? t('No due date');

  return (
    <div
      className={`group relative w-full text-left bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50/30 transition-colors flex flex-col overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.(caseDetail.caseId)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(caseDetail.caseId); }}
    >
      {/* Type accent strip */}
      <div className={`h-1 w-full bg-gradient-to-r ${accent} flex-shrink-0`} />

      <div className="flex flex-col flex-1 p-5">
        {/* Header row: type + status + edit */}
        <div className="flex justify-between items-center mb-3 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${badge}`}>
              {t(CASE_TYPE_LABELS[caseDetail.caseType])}
            </span>
            {caseDetail.parentCaseId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-0.5">
                <GitBranch size={9} /> {t('Sub-case')}
              </span>
            )}
            {caseDetail.deliveryType === CaseDeliveryType.OPEN && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200/80">
                {t(CASE_DELIVERY_TYPE_LABELS[CaseDeliveryType.OPEN])}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full ${statusStyles[caseDetail.status]}`}>
              {t(CASE_STATUS_LABELS[caseDetail.status])}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(caseDetail); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                className="p-1 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title={t("Edit Case")}
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-800 mb-1.5 line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors duration-200">
          {caseDetail.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {caseDetail.description || <span className="italic">{t('No description')}</span>}
        </p>

        {/* Owner info */}
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            {ownerTypeLabel[caseDetail.ownerType]}:{' '}
            {caseDetail.ownerId.length > 8 ? `${caseDetail.ownerId.slice(0, 8)}…` : caseDetail.ownerId}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-100 w-full mt-auto">
          <div className={`flex items-center gap-1.5 font-medium ${dueDateClass}`}>
            <Calendar size={11} className="flex-shrink-0" />
            <span>{dueDateLabel}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-500 transition-colors duration-200">
            <span>{createdDate}</span>
            <ArrowRight size={11} className="md:opacity-0 md:group-hover:opacity-100 md:-translate-x-1 md:group-hover:translate-x-0 transition-all duration-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

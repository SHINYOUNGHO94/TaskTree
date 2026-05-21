import { CaseDetail, CaseStatus, CaseType } from '@task/core';
import { Calendar } from 'lucide-react';

interface CaseCardProps {
  caseDetail: CaseDetail;
}

const caseTypeStyles: Record<CaseType, string> = {
  [CaseType.REQUEST]: 'bg-orange-50 text-orange-600 border border-orange-100',
  [CaseType.STANDARD]: 'bg-blue-50 text-blue-600 border border-blue-100',
  [CaseType.PROJECT]: 'bg-purple-50 text-purple-600 border border-purple-100',
};

const statusStyles: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: 'bg-gray-100 text-gray-600',
  [CaseStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-600 border border-blue-100',
  [CaseStatus.REVIEW_REQUESTED]: 'bg-purple-50 text-purple-600 border border-purple-100',
  [CaseStatus.COMPLETED]: 'bg-green-50 text-green-600 border border-green-100',
  [CaseStatus.ON_HOLD]: 'bg-yellow-50 text-yellow-600 border border-yellow-100',
  [CaseStatus.CANCELED]: 'bg-red-50 text-red-600 border border-red-100',
  [CaseStatus.REOPENED]: 'bg-orange-50 text-orange-600 border border-orange-100',
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: '待機中',
  [CaseStatus.IN_PROGRESS]: '対応中',
  [CaseStatus.REVIEW_REQUESTED]: 'レビュー依頼',
  [CaseStatus.COMPLETED]: '完了',
  [CaseStatus.ON_HOLD]: '保留',
  [CaseStatus.CANCELED]: 'キャンセル',
  [CaseStatus.REOPENED]: '再開',
};

export const CaseCard: React.FC<CaseCardProps> = ({ caseDetail }) => {
  const createdDate = new Date(caseDetail.createdAt).toLocaleDateString('ja-JP');

  return (
    <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-gray-300 transition-all shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${caseTypeStyles[caseDetail.caseType]}`}>
          {caseDetail.caseType}
        </span>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusStyles[caseDetail.status]}`}>
          {STATUS_LABELS[caseDetail.status]}
        </span>
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
        {caseDetail.title}
      </h3>

      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
        {caseDetail.description}
      </p>

      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar size={13} className="text-gray-400" />
          <span>{caseDetail.dueDate ?? '期限なし'}</span>
        </div>
        <span className="text-gray-400">{createdDate}</span>
      </div>
    </div>
  );
};

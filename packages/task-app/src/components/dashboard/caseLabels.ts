import {
  CaseClaimRequestStatus,
  CaseDeliveryType,
  CaseStatus,
  CaseTargetScope,
  CaseTaskStatus,
  CaseType,
} from "@task/core";

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  [CaseType.REQUEST]: "依頼",
  [CaseType.STANDARD]: "通常案件",
  [CaseType.PROJECT]: "プロジェクト",
};

export const CASE_DELIVERY_TYPE_LABELS: Record<CaseDeliveryType, string> = {
  [CaseDeliveryType.DIRECT]: "指名",
  [CaseDeliveryType.OPEN]: "公募",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: "待機中",
  [CaseStatus.IN_PROGRESS]: "対応中",
  [CaseStatus.REVIEW_REQUESTED]: "レビュー依頼",
  [CaseStatus.COMPLETED]: "完了",
  [CaseStatus.ON_HOLD]: "保留",
  [CaseStatus.CANCELED]: "キャンセル",
  [CaseStatus.REOPENED]: "再開",
};

export const CASE_TARGET_SCOPE_LABELS: Record<CaseTargetScope, string> = {
  [CaseTargetScope.COMPANY]: "会社",
  [CaseTargetScope.DIVISION]: "本部",
  [CaseTargetScope.DEPARTMENT]: "部署",
  [CaseTargetScope.TEAM]: "チーム",
  [CaseTargetScope.USER]: "ユーザー",
};

export const CLAIM_STATUS_LABELS: Record<CaseClaimRequestStatus, string> = {
  [CaseClaimRequestStatus.PENDING]: "申請中",
  [CaseClaimRequestStatus.APPROVED]: "承認済み",
  [CaseClaimRequestStatus.REJECTED]: "却下",
};

export const CASE_TASK_STATUS_LABELS: Record<CaseTaskStatus, string> = {
  [CaseTaskStatus.TODO]: "未対応",
  [CaseTaskStatus.IN_PROGRESS]: "対応中",
  [CaseTaskStatus.REVIEW_REQUESTED]: "レビュー依頼",
  [CaseTaskStatus.DONE]: "完了",
  [CaseTaskStatus.ON_HOLD]: "保留",
  [CaseTaskStatus.CANCELED]: "キャンセル",
};

export function shortId(id: string): string {
  if (!id) return "不明なユーザー";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export function resolveDisplayName(
  id: string,
  userMap: Map<string, { name: string; email: string }>,
): string {
  const user = userMap.get(id);
  if (!user) return shortId(id);
  return user.name || user.email || shortId(id);
}

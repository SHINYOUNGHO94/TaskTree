import {
  CaseClaimRequestStatus,
  CaseDeliveryType,
  CaseStatus,
  CaseTargetScope,
  CaseTaskStatus,
  CaseType,
  UserRole,
} from "@task/core";
import i18n from "../../i18n";

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  [CaseType.REQUEST]: "Request",
  [CaseType.STANDARD]: "Standard Case",
  [CaseType.PROJECT]: "Project",
};

export const CASE_DELIVERY_TYPE_LABELS: Record<CaseDeliveryType, string> = {
  [CaseDeliveryType.DIRECT]: "Direct",
  [CaseDeliveryType.OPEN]: "Open Recruitment",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.WAITING]: "Waiting",
  [CaseStatus.IN_PROGRESS]: "In Progress",
  [CaseStatus.REVIEW_REQUESTED]: "Review Requested",
  [CaseStatus.COMPLETED]: "Completed",
  [CaseStatus.ON_HOLD]: "On Hold",
  [CaseStatus.CANCELED]: "Canceled",
  [CaseStatus.REOPENED]: "Reopened",
};

export const CASE_TARGET_SCOPE_LABELS: Record<CaseTargetScope, string> = {
  [CaseTargetScope.COMPANY]: "Company",
  [CaseTargetScope.DIVISION]: "Division",
  [CaseTargetScope.DEPARTMENT]: "Department",
  [CaseTargetScope.TEAM]: "Team",
  [CaseTargetScope.USER]: "User",
};

export const CLAIM_STATUS_LABELS: Record<CaseClaimRequestStatus, string> = {
  [CaseClaimRequestStatus.PENDING]: "Pending",
  [CaseClaimRequestStatus.APPROVED]: "Approved",
  [CaseClaimRequestStatus.REJECTED]: "Rejected",
};

export const CASE_TASK_STATUS_LABELS: Record<CaseTaskStatus, string> = {
  [CaseTaskStatus.TODO]: "Todo",
  [CaseTaskStatus.IN_PROGRESS]: "In Progress",
  [CaseTaskStatus.REVIEW_REQUESTED]: "Review Requested",
  [CaseTaskStatus.DONE]: "Done",
  [CaseTaskStatus.ON_HOLD]: "On Hold",
  [CaseTaskStatus.CANCELED]: "Canceled",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.GUEST]:          "Guest",
  [UserRole.USER]:           "Member",
  [UserRole.TEAM_ADMIN]:     "Team Leader",
  [UserRole.DEPT_ADMIN]:     "Dept Head",
  [UserRole.DIVISION_ADMIN]: "Division Head",
  [UserRole.COMPANY_ADMIN]:  "Company Admin",
};

export function shortId(id: string): string {
  if (!id) return i18n.t("Unknown User", { ns: "ui" });
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

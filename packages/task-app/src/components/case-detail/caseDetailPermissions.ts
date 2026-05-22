import {
  CaseDetail,
  CaseOwnerType,
  CaseTargetScope,
  CaseTaskDetail,
  UserProfile,
  UserRole,
} from "@task/core";

export const CHILD_CASE_ROLE_RANK: Partial<Record<UserRole, number>> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

export const CHILD_CASE_ALLOWED_SCOPES_BY_ROLE: Partial<Record<UserRole, CaseTargetScope[]>> = {
  [UserRole.COMPANY_ADMIN]: [
    CaseTargetScope.COMPANY,
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DIVISION_ADMIN]: [
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DEPT_ADMIN]: [CaseTargetScope.DEPARTMENT, CaseTargetScope.TEAM, CaseTargetScope.USER],
  [UserRole.TEAM_ADMIN]: [CaseTargetScope.TEAM, CaseTargetScope.USER],
  [UserRole.USER]: [CaseTargetScope.USER],
  [UserRole.GUEST]: [CaseTargetScope.USER],
};

export const USER_ROLE_LABELS: Partial<Record<UserRole, string>> = {
  [UserRole.GUEST]: "ゲスト",
  [UserRole.USER]: "ユーザー",
  [UserRole.TEAM_ADMIN]: "チームリーダー",
  [UserRole.DEPT_ADMIN]: "部署管理者",
  [UserRole.DIVISION_ADMIN]: "事業部管理者",
  [UserRole.COMPANY_ADMIN]: "会社管理者",
};

export const canManageCaseOwner = (profile: UserProfile | null, caseDetail: CaseDetail): boolean => {
  if (!profile) return false;
  if (profile.role === UserRole.COMPANY_ADMIN && caseDetail.ownerType === CaseOwnerType.COMPANY) {
    return true;
  }
  if (caseDetail.ownerType === CaseOwnerType.DIVISION) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.DEPARTMENT) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.TEAM) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId) ||
      (profile.role === UserRole.TEAM_ADMIN && caseDetail.teamId === profile.teamId)
    );
  }
  return false;
};

export const canManageCaseTask = (
  task: CaseTaskDetail,
  caseDetail: CaseDetail,
  currentUserId: string | null,
  profile: UserProfile | null,
): boolean => {
  if (!currentUserId) return false;
  return (
    caseDetail.creatorId === currentUserId ||
    (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === currentUserId) ||
    canManageCaseOwner(profile, caseDetail) ||
    task.creatorId === currentUserId ||
    task.assigneeId === currentUserId
  );
};

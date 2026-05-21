import {
  CaseDeliveryType,
  CaseDetail,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseParticipantCompanyStatus,
  CaseTargetScope,
  UserRole,
} from "@task/core";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

export interface CaseReadCaller {
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  role: UserRole;
}

export const canReadCase = (
  caseDetail: CaseDetail,
  userId: string,
  caller: CaseReadCaller,
): boolean => {
  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;

  if (ROLE_RANK[caller.role] < ROLE_RANK[caseDetail.requiredRole]) return false;

  switch (caseDetail.targetScope) {
    case CaseTargetScope.COMPANY:
      return caseDetail.targetScopeId === caller.companyId;
    case CaseTargetScope.DIVISION:
      return caseDetail.targetScopeId === caller.divisionId;
    case CaseTargetScope.DEPARTMENT:
      return caseDetail.targetScopeId === caller.departmentId;
    case CaseTargetScope.TEAM:
      return caseDetail.targetScopeId === caller.teamId;
    case CaseTargetScope.USER:
      return caseDetail.targetScopeId === userId;
  }

  return false;
};

export const canReadCaseAsParticipant = (
  caseDetail: CaseDetail,
  participantRecord: CaseParticipantCompany | undefined,
  callerCompanyId: string,
): boolean => {
  if (caseDetail.deliveryType !== CaseDeliveryType.OPEN) return false;
  if (!participantRecord) return false;
  if (participantRecord.companyId !== callerCompanyId) return false;
  return participantRecord.status === CaseParticipantCompanyStatus.ACTIVE;
};

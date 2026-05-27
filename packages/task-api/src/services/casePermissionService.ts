import {
  CaseDetail,
  CaseDeliveryType,
  CaseOwnerType,
  CaseParticipantCompany,
  CaseParticipantCompanyStatus,
  CaseParticipantType,
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

export interface CaseEditCaller {
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  role: UserRole;
}

export const canEditCase = (
  caseDetail: CaseDetail,
  userId: string,
  caller: CaseEditCaller,
): boolean => {
  if (caller.companyId !== caseDetail.companyId) return false;

  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;

  switch (caller.role) {
    case UserRole.COMPANY_ADMIN:
      return caller.companyId === caseDetail.companyId;
    case UserRole.DIVISION_ADMIN:
      return caller.divisionId === caseDetail.divisionId;
    case UserRole.DEPT_ADMIN:
      return caller.departmentId === caseDetail.departmentId;
    case UserRole.TEAM_ADMIN:
      return caller.teamId === caseDetail.teamId;
    default:
      return false;
  }
};

export const canReadCaseAsParticipant = (
  caseDetail: CaseDetail,
  participantRecord: CaseParticipantCompany | undefined,
  callerCompanyId: string,
): boolean => {
  if (caseDetail.deliveryType !== CaseDeliveryType.OPEN) return false;
  if (!participantRecord) return false;
  if (participantRecord.caseId !== caseDetail.caseId) return false;
  if (participantRecord.ownerCompanyId !== caseDetail.companyId) return false;
  if (participantRecord.companyId !== callerCompanyId) return false;
  return participantRecord.status === CaseParticipantCompanyStatus.ACTIVE;
};

export const canReadCaseAsClient = (
  caseDetail: CaseDetail,
  participantRecord: CaseParticipantCompany | undefined,
  callerCompanyId: string,
): boolean => {
  if (!participantRecord) return false;
  if (participantRecord.participantType !== CaseParticipantType.CLIENT) return false;
  // Record must belong to this case directly, or to the parent PROJECT of this case
  const isDirectRecord = participantRecord.caseId === caseDetail.caseId;
  const isParentProjectRecord = !!caseDetail.projectId && participantRecord.caseId === caseDetail.projectId;
  if (!isDirectRecord && !isParentProjectRecord) return false;
  if (participantRecord.ownerCompanyId !== caseDetail.companyId) return false;
  if (participantRecord.companyId !== callerCompanyId) return false;
  return participantRecord.status === CaseParticipantCompanyStatus.ACTIVE;
  // No deliveryType check — CLIENT can access PROJECT regardless of deliveryType
};

export const canReadCaseAsAnyParticipant = (
  caseDetail: CaseDetail,
  participantRecord: CaseParticipantCompany | undefined,
  callerCompanyId: string,
): boolean => {
  if (!participantRecord) return false;
  if (participantRecord.participantType === CaseParticipantType.CLIENT) {
    return canReadCaseAsClient(caseDetail, participantRecord, callerCompanyId);
  }
  return canReadCaseAsParticipant(caseDetail, participantRecord, callerCompanyId);
};

import {
  CaseDeliveryType,
  CaseDetail,
  CaseStatus,
  CaseTargetScope,
  UserRole,
} from "@task/core";
import { DynamoDBRecord } from "./DynamoDBRecord";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

export interface CaseVisibilityRecordType extends DynamoDBRecord {
  caseId: string;
  ownerCompanyId: string;
  visibilityKey: string;
  visibilitySortKey: string;
  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;
  requiredRoleRank: number;
  deliveryType: CaseDeliveryType;
  status: CaseStatus;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseVisibility" as const;

const makePk = () => ENTITY_NAME;

const makeSk = (caseId: string, visibilityKey: string) =>
  `Case#${caseId}#Visibility#${visibilityKey}`;

const makeVisibilityKey = (targetScope: CaseTargetScope, targetScopeId: string) =>
  `${targetScope}#${targetScopeId}`;

const makeVisibilitySortKey = (
  requiredRoleRank: number,
  status: CaseStatus,
  updatedAt: string,
  caseId: string,
) => `Role#${requiredRoleRank}#Case#${status}#${updatedAt}#${caseId}`;

const fromDetail = (detail: CaseDetail): CaseVisibilityRecordType => {
  const visibilityKey = makeVisibilityKey(detail.targetScope, detail.targetScopeId);
  const requiredRoleRank = ROLE_RANK[detail.requiredRole];
  return {
    pk: makePk(),
    sk: makeSk(detail.caseId, visibilityKey),
    caseId: detail.caseId,
    ownerCompanyId: detail.companyId,
    visibilityKey,
    visibilitySortKey: makeVisibilitySortKey(
      requiredRoleRank,
      detail.status,
      detail.updatedAt,
      detail.caseId,
    ),
    targetScope: detail.targetScope,
    targetScopeId: detail.targetScopeId,
    requiredRole: detail.requiredRole,
    requiredRoleRank,
    deliveryType: detail.deliveryType,
    status: detail.status,
    at: detail.createdAt,
    update_at: detail.updatedAt,
  };
};

export const CaseVisibilityRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeVisibilityKey,
  makeVisibilitySortKey,
  fromDetail,
} as const;

import {
  CaseDetail,
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { DynamoDBRecord } from "./DynamoDBRecord";

export interface CaseRecordType extends DynamoDBRecord {
  caseId: string;
  caseSortKey: string;
  name: string;
  description: string;
  caseType: CaseType;
  status: CaseStatus;
  deliveryType: CaseDeliveryType;
  ownerType: CaseOwnerType;
  ownerId: string;
  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  creatorId: string;
  projectId?: string;
  parentCaseId?: string;
  dueDate?: string;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "Case" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string) => `Case#${caseId}`;
const makeCaseSortKey = (caseId: string) => `Meta#Case#${caseId}`;

const fromDetail = (detail: CaseDetail): CaseRecordType => {
  const record: CaseRecordType = {
    pk: makePk(),
    sk: makeSk(detail.caseId),
    caseId: detail.caseId,
    caseSortKey: makeCaseSortKey(detail.caseId),
    name: detail.title,
    description: detail.description,
    caseType: detail.caseType,
    status: detail.status,
    deliveryType: detail.deliveryType,
    ownerType: detail.ownerType,
    ownerId: detail.ownerId,
    targetScope: detail.targetScope,
    targetScopeId: detail.targetScopeId,
    requiredRole: detail.requiredRole,
    companyId: detail.companyId,
    divisionId: detail.divisionId,
    departmentId: detail.departmentId,
    teamId: detail.teamId,
    creatorId: detail.creatorId,
    at: detail.createdAt,
    update_at: detail.updatedAt,
  };

  if (detail.projectId !== null) record.projectId = detail.projectId;
  if (detail.parentCaseId !== null) record.parentCaseId = detail.parentCaseId;
  if (detail.dueDate !== null) record.dueDate = detail.dueDate;

  return record;
};

const toDetail = (record: CaseRecordType): CaseDetail => ({
  caseId: record.caseId,
  title: record.name,
  description: record.description,
  caseType: record.caseType,
  status: record.status,
  deliveryType: record.deliveryType,
  ownerType: record.ownerType,
  ownerId: record.ownerId,
  targetScope: record.targetScope,
  targetScopeId: record.targetScopeId,
  requiredRole: record.requiredRole,
  companyId: record.companyId,
  divisionId: record.divisionId,
  departmentId: record.departmentId,
  teamId: record.teamId,
  creatorId: record.creatorId,
  projectId: record.projectId ?? null,
  parentCaseId: record.parentCaseId ?? null,
  dueDate: record.dueDate ?? null,
  createdAt: record.at,
  updatedAt: record.update_at,
});

export const CaseRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromDetail,
  toDetail,
} as const;

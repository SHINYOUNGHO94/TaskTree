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
  assigneeKey: string;
  assigneeSortKey: string;
  visibilityKey: string;
  visibilitySortKey: string;
  name: string;
  description: string;
  descriptionFormat?: string;
  descriptionText?: string;
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
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string) => `Case#${caseId}`;
const makeCaseSortKey = (caseId: string) => `Meta#Case#${caseId}`;
const makeChildCaseSortKey = (status: CaseStatus, updatedAt: string, childCaseId: string) =>
  `ChildCase#${status}#${updatedAt}#${childCaseId}`;
const makeAssigneeKey = (ownerType: CaseOwnerType, ownerId: string) => `${ownerType}#${ownerId}`;
const makeAssigneeSortKey = (detail: CaseDetail) =>
  `Case#${detail.status}#${detail.dueDate ?? "NONE"}#${detail.caseId}`;
const makeVisibilityKey = (targetScope: CaseTargetScope, targetScopeId: string) =>
  `${targetScope}#${targetScopeId}`;
const makeVisibilitySortKey = (detail: CaseDetail) =>
  `Role#${ROLE_RANK[detail.requiredRole]}#Case#${detail.status}#${detail.updatedAt}#${detail.caseId}`;

const fromDetail = (detail: CaseDetail): CaseRecordType => {
  const isChild = detail.parentCaseId !== null;
  const record: CaseRecordType = {
    pk: makePk(),
    sk: makeSk(detail.caseId),
    caseId: isChild ? (detail.parentCaseId as string) : detail.caseId,
    caseSortKey: isChild
      ? makeChildCaseSortKey(detail.status, detail.updatedAt, detail.caseId)
      : makeCaseSortKey(detail.caseId),
    assigneeKey: makeAssigneeKey(detail.ownerType, detail.ownerId),
    assigneeSortKey: makeAssigneeSortKey(detail),
    visibilityKey: makeVisibilityKey(detail.targetScope, detail.targetScopeId),
    visibilitySortKey: makeVisibilitySortKey(detail),
    name: detail.title,
    description: detail.description,
    caseType: detail.caseType,
    // descriptionFormat and descriptionText set below (omit-if-absent pattern)
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
  if (detail.descriptionFormat !== undefined) record.descriptionFormat = detail.descriptionFormat;
  if (detail.descriptionText !== undefined) record.descriptionText = detail.descriptionText;

  return record;
};

const toDetail = (record: CaseRecordType): CaseDetail => ({
  caseId: record.sk.replace(/^Case#/, ""),
  title: record.name,
  description: record.description,
  ...(record.descriptionFormat !== undefined ? { descriptionFormat: record.descriptionFormat as "plain" | "tiptap_json" } : {}),
  ...(record.descriptionText !== undefined ? { descriptionText: record.descriptionText } : {}),
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
  makeChildCaseSortKey,
  makeAssigneeKey,
  makeVisibilityKey,
  fromDetail,
  toDetail,
} as const;

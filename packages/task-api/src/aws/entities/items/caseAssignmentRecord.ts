import { CaseDetail, CaseOwnerType } from "@task/core";
import { DynamoDBRecord } from "./DynamoDBRecord";

export interface CaseAssignmentRecordType extends DynamoDBRecord {
  caseId: string;
  ownerCompanyId: string;
  assigneeKey: string;
  assigneeSortKey: string;
  status: string;
  dueDate?: string;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseAssignment" as const;

const makePk = () => ENTITY_NAME;

const makeSk = (caseId: string, assigneeKey: string) =>
  `Case#${caseId}#Assignment#${assigneeKey}`;

const makeAssigneeKey = (ownerType: CaseOwnerType, ownerId: string) =>
  `${ownerType}#${ownerId}`;

const makeAssigneeSortKey = (
  status: string,
  dueDate: string | null,
  caseId: string,
) => `Case#${status}#${dueDate ?? "NONE"}#${caseId}`;

const fromDetail = (detail: CaseDetail): CaseAssignmentRecordType => {
  const assigneeKey = makeAssigneeKey(detail.ownerType, detail.ownerId);
  const record: CaseAssignmentRecordType = {
    pk: makePk(),
    sk: makeSk(detail.caseId, assigneeKey),
    caseId: detail.caseId,
    ownerCompanyId: detail.companyId,
    assigneeKey,
    assigneeSortKey: makeAssigneeSortKey(detail.status, detail.dueDate, detail.caseId),
    status: detail.status,
    at: detail.createdAt,
    update_at: detail.updatedAt,
  };
  if (detail.dueDate !== null) record.dueDate = detail.dueDate;
  return record;
};

export const CaseAssignmentRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeAssigneeKey,
  makeAssigneeSortKey,
  fromDetail,
} as const;

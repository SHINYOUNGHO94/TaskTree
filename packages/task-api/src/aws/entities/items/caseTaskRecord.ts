import { CaseTaskDetail, CaseTaskStatus } from "@task/core";

export interface CaseTaskRecordType {
  pk: string;
  sk: string;
  taskId: string;
  caseId: string;
  caseSortKey: string;
  companyId: string;
  creatorId: string;
  assigneeId?: string;
  name: string;
  description: string;
  status: CaseTaskStatus;
  dueDate?: string;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseTask" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, taskId: string) => `Case#${caseId}#CaseTask#${taskId}`;
const makeCaseSortKey = (status: CaseTaskStatus, updatedAt: string, taskId: string) =>
  `CaseTask#${status}#${updatedAt}#${taskId}`;

const fromDetail = (detail: CaseTaskDetail): CaseTaskRecordType => {
  const record: CaseTaskRecordType = {
    pk: makePk(),
    sk: makeSk(detail.caseId, detail.taskId),
    taskId: detail.taskId,
    caseId: detail.caseId,
    caseSortKey: makeCaseSortKey(detail.status, detail.updatedAt, detail.taskId),
    companyId: detail.companyId,
    creatorId: detail.creatorId,
    name: detail.title,
    description: detail.description,
    status: detail.status,
    at: detail.createdAt,
    update_at: detail.updatedAt,
  };

  if (detail.assigneeId !== null) record.assigneeId = detail.assigneeId;
  if (detail.dueDate !== null) record.dueDate = detail.dueDate;

  return record;
};

const toDetail = (record: CaseTaskRecordType): CaseTaskDetail => ({
  taskId: record.taskId,
  caseId: record.caseId,
  companyId: record.companyId,
  creatorId: record.creatorId,
  assigneeId: record.assigneeId ?? null,
  title: record.name,
  description: record.description,
  status: record.status,
  dueDate: record.dueDate ?? null,
  createdAt: record.at,
  updatedAt: record.update_at,
});

export const CaseTaskRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromDetail,
  toDetail,
} as const;

import { CaseHistoryAction, CaseHistoryEntry } from "@task/core";

export interface CaseHistoryRecordType {
  pk: string;
  sk: string;
  historyId: string;
  caseId: string;
  caseSortKey: string;
  companyId: string;
  actorId: string;
  action: CaseHistoryAction;
  detail: string;
  at: string;
}

const ENTITY_NAME = "CaseHistory" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, historyId: string) => `Case#${caseId}#CaseHistory#${historyId}`;
const makeCaseSortKey = (createdAt: string, historyId: string) =>
  `CaseHistory#${createdAt}#${historyId}`;

const fromEntry = (entry: CaseHistoryEntry): CaseHistoryRecordType => ({
  pk: makePk(),
  sk: makeSk(entry.caseId, entry.historyId),
  historyId: entry.historyId,
  caseId: entry.caseId,
  caseSortKey: makeCaseSortKey(entry.createdAt, entry.historyId),
  companyId: entry.companyId,
  actorId: entry.actorId,
  action: entry.action,
  detail: entry.detail,
  at: entry.createdAt,
});

const toEntry = (record: CaseHistoryRecordType): CaseHistoryEntry => ({
  historyId: record.historyId,
  caseId: record.caseId,
  companyId: record.companyId,
  actorId: record.actorId,
  action: record.action,
  detail: record.detail,
  createdAt: record.at,
});

export const CaseHistoryRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromEntry,
  toEntry,
} as const;

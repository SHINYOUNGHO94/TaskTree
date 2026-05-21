import { CaseParticipantCompany, CaseParticipantCompanyStatus } from "@task/core";
import { DynamoDBRecord } from "./DynamoDBRecord";

export interface CaseParticipantCompanyRecordType extends DynamoDBRecord {
  caseId: string;
  caseSortKey: string;
  participantCompanyId: string;
  participantCompanySortKey: string;
  ownerCompanyId: string;
  companyId: string;
  companyName?: string;
  status: CaseParticipantCompanyStatus;
  invitedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseParticipantCompany" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, companyId: string) =>
  `Case#${caseId}#ParticipantCompany#${companyId}`;
const makeCaseSortKey = (status: CaseParticipantCompanyStatus, createdAt: string, companyId: string) =>
  `ParticipantCompany#${status}#${createdAt}#${companyId}`;
const makeParticipantCompanySortKey = (status: CaseParticipantCompanyStatus, updatedAt: string, caseId: string) =>
  `Case#${status}#${updatedAt}#${caseId}`;

const fromEntity = (entity: CaseParticipantCompany): CaseParticipantCompanyRecordType => {
  const record: CaseParticipantCompanyRecordType = {
    pk: makePk(),
    sk: makeSk(entity.caseId, entity.companyId),
    caseId: entity.caseId,
    caseSortKey: makeCaseSortKey(entity.status, entity.createdAt, entity.companyId),
    participantCompanyId: entity.companyId,
    participantCompanySortKey: makeParticipantCompanySortKey(entity.status, entity.updatedAt, entity.caseId),
    ownerCompanyId: entity.ownerCompanyId,
    companyId: entity.companyId,
    status: entity.status,
    invitedBy: entity.invitedBy,
    at: entity.createdAt,
    update_at: entity.updatedAt,
  };

  if (entity.companyName !== null) record.companyName = entity.companyName;
  if (entity.reviewedBy !== null) record.reviewedBy = entity.reviewedBy;
  if (entity.reviewedAt !== null) record.reviewedAt = entity.reviewedAt;

  return record;
};

const toEntity = (record: CaseParticipantCompanyRecordType): CaseParticipantCompany => ({
  participantCompanyId: record.companyId,
  caseId: record.caseId,
  ownerCompanyId: record.ownerCompanyId,
  companyId: record.companyId,
  companyName: record.companyName ?? null,
  status: record.status,
  invitedBy: record.invitedBy,
  reviewedBy: record.reviewedBy ?? null,
  reviewedAt: record.reviewedAt ?? null,
  createdAt: record.at,
  updatedAt: record.update_at,
});

export const CaseParticipantCompanyRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  makeParticipantCompanySortKey,
  fromEntity,
  toEntity,
} as const;

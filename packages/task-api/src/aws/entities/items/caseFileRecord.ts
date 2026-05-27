import { CaseFile } from "@task/core";

export interface CaseFileRecordType {
  pk: string;
  sk: string;
  fileId: string;
  caseId: string;
  caseSortKey: string;
  companyId: string;
  uploaderCompanyId: string;
  uploadedBy: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  objectKey: string;
  at: string;
}

const ENTITY_NAME = "CaseFile" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, fileId: string) =>
  `Case#${caseId}#CaseFile#${fileId}`;
const makeCaseSortKey = (createdAt: string, fileId: string) =>
  `CaseFile#${createdAt}#${fileId}`;

const fromEntity = (
  entity: CaseFile & { objectKey: string },
): CaseFileRecordType => ({
  pk: makePk(),
  sk: makeSk(entity.caseId, entity.fileId),
  fileId: entity.fileId,
  caseId: entity.caseId,
  caseSortKey: makeCaseSortKey(entity.createdAt, entity.fileId),
  companyId: entity.companyId,
  uploaderCompanyId: entity.uploaderCompanyId,
  uploadedBy: entity.uploadedBy,
  fileName: entity.fileName,
  contentType: entity.contentType,
  fileSize: entity.fileSize,
  objectKey: entity.objectKey,
  at: entity.createdAt,
});

const toEntity = (record: CaseFileRecordType): CaseFile & { objectKey: string } => ({
  fileId: record.fileId,
  caseId: record.caseId,
  companyId: record.companyId,
  uploaderCompanyId: record.uploaderCompanyId,
  uploadedBy: record.uploadedBy,
  fileName: record.fileName,
  contentType: record.contentType,
  fileSize: record.fileSize,
  objectKey: record.objectKey,
  createdAt: record.at,
});

export const CaseFileRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromEntity,
  toEntity,
} as const;

import { CaseClaimRequest, CaseClaimRequestStatus } from "@task/core";

export interface CaseClaimRequestRecordType {
  pk: string;
  sk: string;
  claimRequestId: string;
  caseId: string;
  caseSortKey: string;
  companyId: string;
  requesterId: string;
  status: CaseClaimRequestStatus;
  message: string | null;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseClaimRequest" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, claimRequestId: string) =>
  `Case#${caseId}#ClaimRequest#${claimRequestId}`;
const makeCaseSortKey = (
  status: CaseClaimRequestStatus,
  createdAt: string,
  claimRequestId: string,
) => `ClaimRequest#${status}#${createdAt}#${claimRequestId}`;

const fromClaimRequest = (claimRequest: CaseClaimRequest): CaseClaimRequestRecordType => ({
  pk: makePk(),
  sk: makeSk(claimRequest.caseId, claimRequest.claimRequestId),
  claimRequestId: claimRequest.claimRequestId,
  caseId: claimRequest.caseId,
  caseSortKey: makeCaseSortKey(
    claimRequest.status,
    claimRequest.createdAt,
    claimRequest.claimRequestId,
  ),
  companyId: claimRequest.companyId,
  requesterId: claimRequest.requesterId,
  status: claimRequest.status,
  message: claimRequest.message,
  rejectReason: claimRequest.rejectReason,
  reviewedBy: claimRequest.reviewedBy,
  reviewedAt: claimRequest.reviewedAt,
  at: claimRequest.createdAt,
  update_at: claimRequest.updatedAt,
});

const toClaimRequest = (record: CaseClaimRequestRecordType): CaseClaimRequest => ({
  claimRequestId: record.claimRequestId,
  caseId: record.caseId,
  companyId: record.companyId,
  requesterId: record.requesterId,
  status: record.status,
  message: record.message,
  rejectReason: record.rejectReason,
  reviewedBy: record.reviewedBy,
  reviewedAt: record.reviewedAt,
  createdAt: record.at,
  updatedAt: record.update_at,
});

export const CaseClaimRequestRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromClaimRequest,
  toClaimRequest,
} as const;

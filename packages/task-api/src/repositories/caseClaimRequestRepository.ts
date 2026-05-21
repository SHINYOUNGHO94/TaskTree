import { QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CaseClaimRequest, CaseDetail } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseClaimRequestRecord,
  CaseClaimRequestRecordType,
} from "@/aws/entities/items/caseClaimRequestRecord";
import { CaseRecord } from "@/aws/entities/items/caseRecord";

export class CaseClaimRequestRepository extends BaseRepository<CaseClaimRequestRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(claimRequest: CaseClaimRequest): Promise<void> {
    const record = CaseClaimRequestRecord.fromClaimRequest(claimRequest);
    await this.put(record);
  }

  async findByCaseId(caseId: string): Promise<CaseClaimRequest[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "ClaimRequest#",
        },
      }),
    );
    const items = (response.Items ?? []) as CaseClaimRequestRecordType[];
    return items.map((item) => CaseClaimRequestRecord.toClaimRequest(item));
  }

  async findById(caseId: string, claimRequestId: string): Promise<CaseClaimRequest | undefined> {
    const pk = CaseClaimRequestRecord.makePk();
    const sk = CaseClaimRequestRecord.makeSk(caseId, claimRequestId);
    const record = await this.get(pk, sk);
    return record ? CaseClaimRequestRecord.toClaimRequest(record) : undefined;
  }

  async approveWithCaseUpdate(params: {
    approvedClaimRequest: CaseClaimRequest;
    updatedCase: CaseDetail;
    rejectedClaimRequests: CaseClaimRequest[];
  }): Promise<void> {
    const approvedRecord = CaseClaimRequestRecord.fromClaimRequest(params.approvedClaimRequest);
    const caseRecord = CaseRecord.fromDetail(params.updatedCase);
    const rejectedRecords = params.rejectedClaimRequests.map((claimRequest) =>
      CaseClaimRequestRecord.fromClaimRequest(claimRequest),
    );

    await this.docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: approvedRecord,
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: caseRecord,
            },
          },
          ...rejectedRecords.map((record) => ({
            Put: {
              TableName: this.tableName,
              Item: record,
            },
          })),
        ],
      }),
    );
  }
}

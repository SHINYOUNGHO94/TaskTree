import { QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CaseClaimRequest, CaseDetail, CaseOwnerType } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseClaimRequestRecord,
  CaseClaimRequestRecordType,
} from "@/aws/entities/items/caseClaimRequestRecord";
import { CaseRecord } from "@/aws/entities/items/caseRecord";
import { CaseAssignmentRecord } from "@/aws/entities/items/caseAssignmentRecord";
import { CaseVisibilityRecord } from "@/aws/entities/items/caseVisibilityRecord";

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
    previousOwner: {
      ownerType: CaseOwnerType;
      ownerId: string;
    };
  }): Promise<void> {
    const approvedRecord = CaseClaimRequestRecord.fromClaimRequest(params.approvedClaimRequest);
    const caseRecord = CaseRecord.fromDetail(params.updatedCase);
    const assignmentRecord = CaseAssignmentRecord.fromDetail(params.updatedCase);
    const visibilityRecord = CaseVisibilityRecord.fromDetail(params.updatedCase);
    const previousAssignmentKey = {
      pk: CaseAssignmentRecord.makePk(),
      sk: CaseAssignmentRecord.makeSk(
        params.updatedCase.caseId,
        CaseAssignmentRecord.makeAssigneeKey(params.previousOwner.ownerType, params.previousOwner.ownerId),
      ),
    };
    const shouldDeletePreviousAssignment =
      previousAssignmentKey.pk !== assignmentRecord.pk ||
      previousAssignmentKey.sk !== assignmentRecord.sk;
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
          ...(shouldDeletePreviousAssignment
            ? [
                {
                  Delete: {
                    TableName: this.tableName,
                    Key: previousAssignmentKey,
                  },
                },
              ]
            : []),
          {
            Put: {
              TableName: this.tableName,
              Item: assignmentRecord,
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: visibilityRecord,
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

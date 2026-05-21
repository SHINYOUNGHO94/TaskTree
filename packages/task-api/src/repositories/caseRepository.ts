import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseDetail, CaseOwnerType, CaseTargetScope } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseRecord, CaseRecordType } from "@/aws/entities/items/caseRecord";

export class CaseRepository extends BaseRepository<CaseRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(caseDetail: CaseDetail): Promise<void> {
    const record = CaseRecord.fromDetail(caseDetail);
    await this.put(record);
  }

  async findById(caseId: string): Promise<CaseDetail | undefined> {
    const pk = CaseRecord.makePk();
    const sk = CaseRecord.makeSk(caseId);
    const record = await this.get(pk, sk);
    return record ? CaseRecord.toDetail(record) : undefined;
  }

  async findChildrenByParentCaseId(parentCaseId: string): Promise<CaseDetail[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": parentCaseId,
          ":prefix": "ChildCase#",
        },
      }),
    );
    return ((response.Items ?? []) as CaseRecordType[]).map(CaseRecord.toDetail);
  }

  async findByUser(params: {
    companyId: string;
    userId: string;
    teamId: string;
  }): Promise<CaseDetail[]> {
    const { companyId, userId, teamId } = params;

    const ownerResponse = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byAssignee",
        KeyConditionExpression: "assigneeKey = :assigneeKey",
        FilterExpression: "companyId = :companyId",
        ExpressionAttributeValues: {
          ":assigneeKey": CaseRecord.makeAssigneeKey(CaseOwnerType.USER, userId),
          ":companyId": companyId,
        },
      })
    );

    const visibilityKeys = [
      CaseRecord.makeVisibilityKey(CaseTargetScope.USER, userId),
      ...(teamId && teamId !== "NONE"
        ? [CaseRecord.makeVisibilityKey(CaseTargetScope.TEAM, teamId)]
        : []),
    ];
    const visibilityResponses = await Promise.all(
      visibilityKeys.map((visibilityKey) =>
        this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byVisibility",
            KeyConditionExpression: "visibilityKey = :visibilityKey",
            FilterExpression: "companyId = :companyId",
            ExpressionAttributeValues: {
              ":visibilityKey": visibilityKey,
              ":companyId": companyId,
            },
          })
        )
      )
    );

    const items = [
      ...((ownerResponse.Items ?? []) as CaseRecordType[]),
      ...visibilityResponses.flatMap((response) => (response.Items ?? []) as CaseRecordType[]),
    ];
    const seen = new Set<string>();
    return items
      .map((item) => CaseRecord.toDetail(item))
      .filter((d) => {
        if (seen.has(d.caseId)) return false;
        seen.add(d.caseId);
        return true;
      });
  }
}

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseTaskDetail } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseTaskRecord, CaseTaskRecordType } from "@/aws/entities/items/caseTaskRecord";

export class CaseTaskRepository extends BaseRepository<CaseTaskRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(task: CaseTaskDetail): Promise<void> {
    const record = CaseTaskRecord.fromDetail(task);
    await this.put(record);
  }

  async findByCaseId(caseId: string): Promise<CaseTaskDetail[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "CaseTask#",
        },
      })
    );
    const items = (response.Items ?? []) as CaseTaskRecordType[];
    return items.map((item) => CaseTaskRecord.toDetail(item));
  }
}

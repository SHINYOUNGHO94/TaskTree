import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseHistoryEntry } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseHistoryRecord, CaseHistoryRecordType } from "@/aws/entities/items/caseHistoryRecord";

export class CaseHistoryRepository extends BaseRepository<CaseHistoryRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(entry: CaseHistoryEntry): Promise<void> {
    const record = CaseHistoryRecord.fromEntry(entry);
    await this.put(record);
  }

  async findByCaseId(caseId: string): Promise<CaseHistoryEntry[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "CaseHistory#",
        },
      })
    );
    const items = (response.Items ?? []) as CaseHistoryRecordType[];
    return items.map((item) => CaseHistoryRecord.toEntry(item));
  }
}

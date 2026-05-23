import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseComment } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseCommentRecord, CaseCommentRecordType } from "@/aws/entities/items/caseCommentRecord";

export class CaseCommentRepository extends BaseRepository<CaseCommentRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(comment: CaseComment): Promise<void> {
    const record = CaseCommentRecord.fromComment(comment);
    await this.put(record);
  }

  async findByCaseId(caseId: string): Promise<CaseComment[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "CaseComment#",
        },
      })
    );
    const items = (response.Items ?? []) as CaseCommentRecordType[];
    return items.map((item) => CaseCommentRecord.toComment(item));
  }
}

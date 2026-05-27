import { DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseFile } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseFileRecord,
  CaseFileRecordType,
} from "@/aws/entities/items/caseFileRecord";

export class CaseFileRepository extends BaseRepository<CaseFileRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(entity: CaseFile & { objectKey: string }): Promise<void> {
    const record = CaseFileRecord.fromEntity(entity);
    await this.put(record);
  }

  async findByCaseId(caseId: string): Promise<(CaseFile & { objectKey: string })[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "CaseFile#",
        },
      }),
    );
    const items = (response.Items ?? []) as CaseFileRecordType[];
    return items.map((item) => CaseFileRecord.toEntity(item));
  }

  async findByFileId(
    caseId: string,
    fileId: string,
  ): Promise<(CaseFile & { objectKey: string }) | undefined> {
    const record = await this.get(
      CaseFileRecord.makePk(),
      CaseFileRecord.makeSk(caseId, fileId),
    );
    return record ? CaseFileRecord.toEntity(record) : undefined;
  }

  async deleteByFileId(caseId: string, fileId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          pk: CaseFileRecord.makePk(),
          sk: CaseFileRecord.makeSk(caseId, fileId),
        },
      }),
    );
  }
}

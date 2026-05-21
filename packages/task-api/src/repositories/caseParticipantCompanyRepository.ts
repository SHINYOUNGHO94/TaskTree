import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { CaseParticipantCompany, CaseParticipantCompanyStatus } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseParticipantCompanyRecord,
  CaseParticipantCompanyRecordType,
} from "@/aws/entities/items/caseParticipantCompanyRecord";

export class CaseParticipantCompanyRepository extends BaseRepository<CaseParticipantCompanyRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(entity: CaseParticipantCompany): Promise<void> {
    const record = CaseParticipantCompanyRecord.fromEntity(entity);
    await this.put(record);
  }

  async findByCaseAndCompany(
    caseId: string,
    companyId: string,
  ): Promise<CaseParticipantCompany | undefined> {
    const pk = CaseParticipantCompanyRecord.makePk();
    const sk = CaseParticipantCompanyRecord.makeSk(caseId, companyId);
    const response = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      }),
    );
    const item = response.Item as CaseParticipantCompanyRecordType | undefined;
    return item ? CaseParticipantCompanyRecord.toEntity(item) : undefined;
  }

  async findByCaseId(caseId: string): Promise<CaseParticipantCompany[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": caseId,
          ":prefix": "ParticipantCompany#",
        },
      }),
    );
    return ((response.Items ?? []) as CaseParticipantCompanyRecordType[]).map(
      CaseParticipantCompanyRecord.toEntity,
    );
  }

  async findByParticipantCompanyId(
    companyId: string,
    statuses: CaseParticipantCompanyStatus[],
  ): Promise<CaseParticipantCompany[]> {
    const results = await Promise.all(
      statuses.map((status) =>
        this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byParticipantCompany",
            KeyConditionExpression:
              "participantCompanyId = :companyId AND begins_with(participantCompanySortKey, :prefix)",
            ExpressionAttributeValues: {
              ":companyId": companyId,
              ":prefix": `Case#${status}#`,
            },
          }),
        ),
      ),
    );

    return results
      .flatMap((r) => (r.Items ?? []) as CaseParticipantCompanyRecordType[])
      .map(CaseParticipantCompanyRecord.toEntity);
  }
}

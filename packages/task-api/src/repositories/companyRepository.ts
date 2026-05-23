import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./baseRepository";
import { CompanyRecord, CompanyRecordType } from "@/aws/entities/items/companyRecord";

export class CompanyRepository extends BaseRepository<CompanyRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async create(companyId: string, name: string): Promise<void> {
    const record: CompanyRecordType = {
      pk: CompanyRecord.makePk(),
      sk: CompanyRecord.makeSk(companyId),
      Company: companyId,
      name,
      at: new Date().toISOString(),
    };

    await this.put(record, "attribute_not_exists(pk)");
  }

  async findById(companyId: string): Promise<CompanyRecordType | undefined> {
    const pk = CompanyRecord.makePk();
    const sk = CompanyRecord.makeSk(companyId);
    return await this.get(pk, sk);
  }

  async updateName(companyId: string, name: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: CompanyRecord.makePk(),
          sk: CompanyRecord.makeSk(companyId),
        },
        UpdateExpression: "SET #name = :name, update_at = :update_at",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: {
          ":name": name,
          ":update_at": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(pk)",
      })
    );
  }

  async findAll(): Promise<CompanyRecordType[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": CompanyRecord.makePk() },
      })
    );
    return (response.Items || []) as CompanyRecordType[];
  }
}

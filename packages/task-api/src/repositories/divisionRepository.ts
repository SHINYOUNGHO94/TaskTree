import { DivisionRecord, DivisionRecordType } from "@/aws/entities/items/divisionRecord";
import { BaseRepository } from "@/repositories/baseRepository";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export class DivisionRepository extends BaseRepository<DivisionRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 事業部を作成します
  create = async (params: {
    companyId: string;
    divisionId: string;
    name: string;
  }): Promise<void> => {
    const record: DivisionRecordType = {
      pk: DivisionRecord.makePk(),
      sk: DivisionRecord.makeSk(params.companyId, params.divisionId),
      companyId: params.companyId,
      divisionId: params.divisionId,
      name: params.name,
      at: new Date().toISOString(),
    };

    await this.put(record, "attribute_not_exists(pk)");
  };

  // 事業部を取得します
  findById = async (companyId: string, divisionId: string): Promise<DivisionRecordType | undefined> => {
    const pk = DivisionRecord.makePk();
    const sk = DivisionRecord.makeSk(companyId, divisionId);
    return await this.get(pk, sk);
  };

  // 会社に所属する全事業部を取得します
  findByCompanyId = async (companyId: string): Promise<DivisionRecordType[]> => {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "company",
        KeyConditionExpression: "companyId = :companyId AND pk = :pk",
        ExpressionAttributeValues: {
          ":companyId": companyId,
          ":pk": DivisionRecord.entityName,
        },
      })
    );
    return (response.Items || []) as DivisionRecordType[];
  };
}

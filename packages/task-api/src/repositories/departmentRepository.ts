import { DepartmentRecord, DepartmentRecordType } from "@/aws/entities/items/departmentRecord";
import { BaseRepository } from "@/repositories/baseRepository";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export class DepartmentRepository extends BaseRepository<DepartmentRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 部署を作成します
  create = async (params: {
    companyId: string;
    divisionId: string;
    departmentId: string;
    name: string;
  }): Promise<void> => {
    const record: DepartmentRecordType = {
      pk: DepartmentRecord.makePk(),
      sk: DepartmentRecord.makeSk(params.divisionId, params.departmentId),
      companyId: params.companyId,
      divisionId: params.divisionId,
      departmentId: params.departmentId,
      name: params.name,
      at: new Date().toISOString(),
    };

    await this.put(record, "attribute_not_exists(pk)");
  };

  // 部署を取得します
  findById = async (divisionId: string, departmentId: string): Promise<DepartmentRecordType | undefined> => {
    const pk = DepartmentRecord.makePk();
    const sk = DepartmentRecord.makeSk(divisionId, departmentId);
    return await this.get(pk, sk);
  };

  // 会社に所属する全部署を取得します
  findByCompanyId = async (companyId: string): Promise<DepartmentRecordType[]> => {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "company",
        KeyConditionExpression: "companyId = :companyId AND pk = :pk",
        ExpressionAttributeValues: {
          ":companyId": companyId,
          ":pk": DepartmentRecord.entityName,
        },
      })
    );
    return (response.Items || []) as DepartmentRecordType[];
  };
}

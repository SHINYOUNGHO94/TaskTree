import { DepartmentRecord, DepartmentRecordType } from "@/aws/entities/items/departmentRecord";
import { BaseRepository } from "@/repositories/baseRepository";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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

  // 事業部に所属する全部署を取得します (主テーブル SK プレフィックスクエリ + companyId フィルタ)
  findByDivisionId = async (divisionId: string, companyId: string): Promise<DepartmentRecordType[]> => {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": DepartmentRecord.makePk(),
          ":skPrefix": `Division#${divisionId}#`,
        },
      })
    );
    const items = (response.Items || []) as DepartmentRecordType[];
    return items.filter((d) => d.companyId === companyId);
  };

  // 会社内で departmentId により部署を取得します
  findByIdInCompany = async (companyId: string, departmentId: string): Promise<DepartmentRecordType | undefined> => {
    const all = await this.findByCompanyId(companyId);
    return all.find((d) => d.departmentId === departmentId);
  };

  // 部署名を更新します
  update = async (divisionId: string, departmentId: string, name: string): Promise<void> => {
    const pk = DepartmentRecord.makePk();
    const sk = DepartmentRecord.makeSk(divisionId, departmentId);
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: "SET #name = :name, update_at = :update_at",
        ExpressionAttributeNames: { "#name": "name" },
        ExpressionAttributeValues: {
          ":name": name,
          ":update_at": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(pk)",
      })
    );
  };

  // 部署を削除します
  deleteById = async (divisionId: string, departmentId: string): Promise<void> => {
    const pk = DepartmentRecord.makePk();
    const sk = DepartmentRecord.makeSk(divisionId, departmentId);
    await this.delete(pk, sk);
  };
}

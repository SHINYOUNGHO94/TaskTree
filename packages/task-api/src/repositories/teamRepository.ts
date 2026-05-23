import { TeamRecord, TeamRecordType } from "@/aws/entities/items/teamRecord";
import { BaseRepository } from "@/repositories/baseRepository";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export class TeamRepository extends BaseRepository<TeamRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // チームを作成します
  create = async (params: {
    companyId: string;
    divisionId: string;
    departmentId: string;
    teamId: string;
    name: string;
  }): Promise<void> => {
    const record: TeamRecordType = {
      pk: TeamRecord.makePk(),
      sk: TeamRecord.makeSk(params.departmentId, params.teamId),
      companyId: params.companyId,
      divisionId: params.divisionId,
      departmentId: params.departmentId,
      teamId: params.teamId,
      name: params.name,
      at: new Date().toISOString(),
    };

    await this.put(record, "attribute_not_exists(pk)");
  };

  // チームを取得します
  findById = async (departmentId: string, teamId: string): Promise<TeamRecordType | undefined> => {
    const pk = TeamRecord.makePk();
    const sk = TeamRecord.makeSk(departmentId, teamId);
    return await this.get(pk, sk);
  };

  // 会社に所属する全チームを取得します
  findByCompanyId = async (companyId: string): Promise<TeamRecordType[]> => {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "company",
        KeyConditionExpression: "companyId = :companyId AND pk = :pk",
        ExpressionAttributeValues: {
          ":companyId": companyId,
          ":pk": TeamRecord.entityName,
        },
      })
    );
    return (response.Items || []) as TeamRecordType[];
  };

  // 部署に所属する全チームを取得します (主テーブル SK プレフィックスクエリ + companyId フィルタ)
  findByDepartmentId = async (departmentId: string, companyId: string): Promise<TeamRecordType[]> => {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": TeamRecord.makePk(),
          ":skPrefix": `Department#${departmentId}#`,
        },
      })
    );
    const items = (response.Items || []) as TeamRecordType[];
    return items.filter((t) => t.companyId === companyId);
  };

  // 会社内で teamId によりチームを取得します
  findByIdInCompany = async (companyId: string, teamId: string): Promise<TeamRecordType | undefined> => {
    const all = await this.findByCompanyId(companyId);
    return all.find((t) => t.teamId === teamId);
  };

  // チーム名を更新します
  update = async (departmentId: string, teamId: string, name: string): Promise<void> => {
    const pk = TeamRecord.makePk();
    const sk = TeamRecord.makeSk(departmentId, teamId);
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

  // チームを削除します
  deleteById = async (departmentId: string, teamId: string): Promise<void> => {
    const pk = TeamRecord.makePk();
    const sk = TeamRecord.makeSk(departmentId, teamId);
    await this.delete(pk, sk);
  };
}

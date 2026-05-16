import { TeamRecord, TeamRecordType } from "@/aws/entities/items/teamRecord";
import { BaseRepository } from "@/repositories/baseRepository";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

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
      Team: params.teamId,
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
}

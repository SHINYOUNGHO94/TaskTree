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
      ...params,
      createdAt: new Date().toISOString(),
    };

    await this.put(record);
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
          ":pk": TeamRecord.prefix,
        },
      })
    );
    return (response.Items || []) as TeamRecordType[];
  };
}

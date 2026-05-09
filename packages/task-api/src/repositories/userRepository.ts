import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./baseRepository";
import { UserRecord, UserRecordType, UserEntity } from "@/aws/entities/items/userRecord";
import { UserRole } from "@task/core";

export class UserRepository extends BaseRepository<UserRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // ユーザーID(sub)からユーザー情報を取得
  async findByUserId(userId: string): Promise<UserEntity | undefined> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "user",
        KeyConditionExpression: "userId = :userId AND pk = :pk",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":pk": UserRecord.prefix,
        },
      })
    );

    const item = response.Items?.[0] as UserRecordType | undefined;
    return item ? UserRecord.intoEntity(item) : undefined;
  }

  // 会社IDから所属するユーザー一覧を取得
  async findByCompanyId(companyId: string): Promise<UserEntity[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "company",
        KeyConditionExpression: "companyId = :companyId AND pk = :pk",
        ExpressionAttributeValues: {
          ":companyId": companyId,
          ":pk": UserRecord.prefix,
        },
      })
    );

    const items = (response.Items || []) as UserRecordType[];
    return items.map(item => UserRecord.intoEntity(item));
  }

  async create(params: {
    companyId: string;
    divisionId?: string;
    departmentId?: string;
    teamId?: string;
    userId: string;
    email: string;
    name: string;
    role: UserRole;
  }): Promise<void> {
    const divisionId = params.divisionId ?? "NONE";
    const departmentId = params.departmentId ?? "NONE";
    const teamId = params.teamId ?? "NONE";

    const record: UserRecordType = {
      pk: UserRecord.makePk(),
      sk: UserRecord.makeSk(teamId, params.userId),
      ...params,
      divisionId,
      departmentId,
      teamId,
      createdAt: new Date().toISOString(),
    };

    await this.put(record);
  }
}

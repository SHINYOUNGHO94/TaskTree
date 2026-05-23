import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
        KeyConditionExpression: "#userAttr = :userId AND pk = :pk",
        ExpressionAttributeNames: {
          "#userAttr": "User",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":pk": UserRecord.entityName,
        },
      })
    );

    const item = response.Items?.[0] as UserRecordType | undefined;
    return item ? UserRecord.toEntity(item) : undefined;
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
          ":pk": UserRecord.entityName,
        },
      })
    );

    const items = (response.Items || []) as UserRecordType[];
    return items.map(item => UserRecord.toEntity(item));
  }

  // チームに所属するユーザー一覧を取得 (主テーブル SK プレフィックスクエリ + companyId フィルタ)
  async findByTeamId(teamId: string, companyId: string): Promise<UserEntity[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": UserRecord.makePk(),
          ":skPrefix": `Team#${teamId}#`,
        },
      })
    );
    const items = (response.Items || []) as UserRecordType[];
    return items.map((item) => UserRecord.toEntity(item)).filter((u) => u.companyId === companyId);
  }

  // 事業部に所属するユーザーが存在するか確認 (company GSI + フィルタ)
  async hasUsersByDivisionId(companyId: string, divisionId: string): Promise<boolean> {
    const users = await this.findByCompanyId(companyId);
    return users.some((u) => u.divisionId === divisionId);
  }

  // 部署に所属するユーザーが存在するか確認 (company GSI + フィルタ)
  async hasUsersByDepartmentId(companyId: string, departmentId: string): Promise<boolean> {
    const users = await this.findByCompanyId(companyId);
    return users.some((u) => u.departmentId === departmentId);
  }

  async updateName(userId: string, name: string): Promise<void> {
    const entity = await this.findByUserId(userId);
    if (!entity) throw new Error("User not found");
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: UserRecord.makePk(),
          sk: UserRecord.makeSk(entity.teamId, userId),
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

  async deleteByUserId(userId: string): Promise<void> {
    const entity = await this.findByUserId(userId);
    if (!entity) return;
    await this.delete(UserRecord.makePk(), UserRecord.makeSk(entity.teamId, entity.User));
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
      companyId: params.companyId,
      divisionId,
      departmentId,
      teamId,
      User: params.userId,
      email: params.email,
      name: params.name,
      role: params.role,
      at: new Date().toISOString(),
    };

    await this.put(record, "attribute_not_exists(pk)");
  }
}

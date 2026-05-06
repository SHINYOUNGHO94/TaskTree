import { BaseRepository } from "./baseRepository";
import { UserRecord, UserRecordType } from "@/aws/entities/items/userRecord";
import { UserRole } from "@task/core";

export class UserRepository extends BaseRepository<UserRecordType> {
  constructor(tableName: string) {
    super(tableName);
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

import { DynamoDBRecord } from "./DynamoDBRecord";
import { UserRole } from "@task/core";

export interface UserEntity {
  pk: string;
  sk: string;
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export function userEntity(params: UserEntity): UserEntity {
  return { ...params };
}

export interface UserRecordProps {
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export type UserRecordType = DynamoDBRecord & UserRecordProps;

export const UserRecord = {
  prefix: "User",

  makePk: () => UserRecord.prefix,
  makeSk: (teamId: string, userId: string) =>
    `Team#${teamId}#${UserRecord.prefix}#${userId}`,

  fromEntity: (entity: UserEntity): UserRecordType => ({
    pk: entity.pk,
    sk: entity.sk,
    companyId: entity.companyId,
    divisionId: entity.divisionId,
    departmentId: entity.departmentId,
    teamId: entity.teamId,
    userId: entity.userId,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }),

  intoEntity: (record: UserRecordType): UserEntity =>
    userEntity({
      pk: record.pk,
      sk: record.sk,
      companyId: record.companyId,
      divisionId: record.divisionId,
      departmentId: record.departmentId,
      teamId: record.teamId,
      userId: record.userId,
      email: record.email,
      name: record.name,
      role: record.role,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
} as const;

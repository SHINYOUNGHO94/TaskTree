import { DynamoDBRecord } from "./DynamoDBRecord";

export interface TeamEntity {
  pk: string;
  sk: string;
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export function teamEntity(params: TeamEntity): TeamEntity {
  return { ...params };
}

export interface TeamRecordProps {
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export type TeamRecordType = DynamoDBRecord & TeamRecordProps;

export const TeamRecord = {
  prefix: "Team",

  makePk: () => TeamRecord.prefix,
  makeSk: (departmentId: string, teamId: string) =>
    `Department#${departmentId}#${TeamRecord.prefix}#${teamId}`,

  fromEntity: (entity: TeamEntity): TeamRecordType => ({
    pk: entity.pk,
    sk: entity.sk,
    companyId: entity.companyId,
    divisionId: entity.divisionId,
    departmentId: entity.departmentId,
    teamId: entity.teamId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }),

  intoEntity: (record: TeamRecordType): TeamEntity =>
    teamEntity({
      pk: record.pk,
      sk: record.sk,
      companyId: record.companyId,
      divisionId: record.divisionId,
      departmentId: record.departmentId,
      teamId: record.teamId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
} as const;

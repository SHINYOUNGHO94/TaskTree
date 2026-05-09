import { DynamoDBRecord } from "./DynamoDBRecord";

export interface DivisionEntity {
  pk: string;
  sk: string;
  companyId: string;
  divisionId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export function divisionEntity(params: DivisionEntity): DivisionEntity {
  return { ...params };
}

export interface DivisionRecordProps {
  companyId: string;
  divisionId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export type DivisionRecordType = DynamoDBRecord & DivisionRecordProps;

export const DivisionRecord = {
  prefix: "Division",

  makePk: () => DivisionRecord.prefix,
  makeSk: (companyId: string, divisionId: string) =>
    `Company#${companyId}#${DivisionRecord.prefix}#${divisionId}`,

  fromEntity: (entity: DivisionEntity): DivisionRecordType => ({
    pk: entity.pk,
    sk: entity.sk,
    companyId: entity.companyId,
    divisionId: entity.divisionId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }),

  intoEntity: (record: DivisionRecordType): DivisionEntity =>
    divisionEntity({
      pk: record.pk,
      sk: record.sk,
      companyId: record.companyId,
      divisionId: record.divisionId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
} as const;

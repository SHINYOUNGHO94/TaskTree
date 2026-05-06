import { DynamoDBRecord } from "./DynamoDBRecord";

export interface CompanyEntity {
  pk: string;
  sk: string;
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export function companyEntity(params: CompanyEntity): CompanyEntity {
  return { ...params };
}

export interface CompanyRecordProps {
  companyId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export type CompanyRecordType = DynamoDBRecord & CompanyRecordProps;

export const CompanyRecord = {
  prefix: "Company",

  makePk: () => CompanyRecord.prefix,
  makeSk: (companyId: string) => `${CompanyRecord.prefix}#${companyId}`,

  fromEntity: (entity: CompanyEntity): CompanyRecordType => ({
    pk: entity.pk,
    sk: entity.sk,
    companyId: entity.companyId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }),

  intoEntity: (record: CompanyRecordType): CompanyEntity =>
    companyEntity({
      pk: record.pk,
      sk: record.sk,
      companyId: record.companyId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
} as const;

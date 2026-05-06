import { DynamoDBRecord } from "./DynamoDBRecord";

export interface DepartmentEntity {
  pk: string;
  sk: string;
  companyId: string;
  divisionId: string;
  departmentId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export function departmentEntity(params: DepartmentEntity): DepartmentEntity {
  return { ...params };
}

export interface DepartmentRecordProps {
  companyId: string;
  divisionId: string;
  departmentId: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export type DepartmentRecordType = DynamoDBRecord & DepartmentRecordProps;

export const DepartmentRecord = {
  prefix: "Department",

  makePk: () => DepartmentRecord.prefix,
  makeSk: (divisionId: string, departmentId: string) =>
    `Division#${divisionId}#${DepartmentRecord.prefix}#${departmentId}`,

  fromEntity: (entity: DepartmentEntity): DepartmentRecordType => ({
    pk: entity.pk,
    sk: entity.sk,
    companyId: entity.companyId,
    divisionId: entity.divisionId,
    departmentId: entity.departmentId,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }),

  intoEntity: (record: DepartmentRecordType): DepartmentEntity =>
    departmentEntity({
      pk: record.pk,
      sk: record.sk,
      companyId: record.companyId,
      divisionId: record.divisionId,
      departmentId: record.departmentId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }),
} as const;

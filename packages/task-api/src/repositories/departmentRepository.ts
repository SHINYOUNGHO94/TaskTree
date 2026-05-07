import { DepartmentRecord, DepartmentRecordType } from "@/aws/entities/items/departmentRecord";
import { BaseRepository } from "@/repositories/baseRepository";

export class DepartmentRepository extends BaseRepository<DepartmentRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 部署を作成します
  create = async (params: {
    companyId: string;
    divisionId: string;
    departmentId: string;
    name: string;
  }): Promise<void> => {
    const record: DepartmentRecordType = {
      pk: DepartmentRecord.makePk(),
      sk: DepartmentRecord.makeSk(params.divisionId, params.departmentId),
      ...params,
      createdAt: new Date().toISOString(),
    };

    await this.put(record);
  };

  // 部署を取得します
  findById = async (divisionId: string, departmentId: string): Promise<DepartmentRecordType | undefined> => {
    const pk = DepartmentRecord.makePk();
    const sk = DepartmentRecord.makeSk(divisionId, departmentId);
    return await this.get(pk, sk);
  };
}

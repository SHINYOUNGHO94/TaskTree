import { DivisionRecord, DivisionRecordType } from "@/aws/entities/items/divisionRecord";
import { BaseRepository } from "@/repositories/baseRepository";

export class DivisionRepository extends BaseRepository<DivisionRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 事業部を作成します
  create = async (params: {
    companyId: string;
    divisionId: string;
    name: string;
  }): Promise<void> => {
    const record: DivisionRecordType = {
      pk: DivisionRecord.makePk(),
      sk: DivisionRecord.makeSk(params.companyId, params.divisionId),
      ...params,
      createdAt: new Date().toISOString(),
    };

    await this.put(record);
  };
}

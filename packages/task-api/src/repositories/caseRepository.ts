import { CaseDetail } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseRecord, CaseRecordType } from "@/aws/entities/items/caseRecord";

export class CaseRepository extends BaseRepository<CaseRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(caseDetail: CaseDetail): Promise<void> {
    const record = CaseRecord.fromDetail(caseDetail);
    await this.put(record);
  }

  async findById(caseId: string): Promise<CaseDetail | undefined> {
    const pk = CaseRecord.makePk();
    const sk = CaseRecord.makeSk(caseId);
    const record = await this.get(pk, sk);
    return record ? CaseRecord.toDetail(record) : undefined;
  }
}

import { CaseDetail } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseVisibilityRecord,
  CaseVisibilityRecordType,
} from "@/aws/entities/items/caseVisibilityRecord";

export class CaseVisibilityRepository extends BaseRepository<CaseVisibilityRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(detail: CaseDetail): Promise<void> {
    const record = CaseVisibilityRecord.fromDetail(detail);
    await this.put(record);
  }

  buildRecord(detail: CaseDetail): CaseVisibilityRecordType {
    return CaseVisibilityRecord.fromDetail(detail);
  }
}

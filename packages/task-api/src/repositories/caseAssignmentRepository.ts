import { CaseDetail } from "@task/core";
import { BaseRepository } from "./baseRepository";
import {
  CaseAssignmentRecord,
  CaseAssignmentRecordType,
} from "@/aws/entities/items/caseAssignmentRecord";

export class CaseAssignmentRepository extends BaseRepository<CaseAssignmentRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(detail: CaseDetail): Promise<void> {
    const record = CaseAssignmentRecord.fromDetail(detail);
    await this.put(record);
  }

  async deleteForOwner(
    caseId: string,
    ownerType: string,
    ownerId: string,
  ): Promise<void> {
    const assigneeKey = `${ownerType}#${ownerId}`;
    const sk = CaseAssignmentRecord.makeSk(caseId, assigneeKey);
    await this.delete(CaseAssignmentRecord.makePk(), sk);
  }

  buildRecord(detail: CaseDetail): CaseAssignmentRecordType {
    return CaseAssignmentRecord.fromDetail(detail);
  }

  buildDeleteKey(
    caseId: string,
    ownerType: string,
    ownerId: string,
  ): { pk: string; sk: string } {
    const assigneeKey = `${ownerType}#${ownerId}`;
    return {
      pk: CaseAssignmentRecord.makePk(),
      sk: CaseAssignmentRecord.makeSk(caseId, assigneeKey),
    };
  }
}

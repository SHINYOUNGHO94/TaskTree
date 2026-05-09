import { BaseRepository } from "./baseRepository";
import { CompanyRecord, CompanyRecordType } from "@/aws/entities/items/companyRecord";

export class CompanyRepository extends BaseRepository<CompanyRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async create(companyId: string, name: string): Promise<void> {
    const record: CompanyRecordType = {
      pk: CompanyRecord.makePk(),
      sk: CompanyRecord.makeSk(companyId),
      companyId,
      name,
      createdAt: new Date().toISOString(),
    };

    await this.put(record);
  }

  async findById(companyId: string): Promise<CompanyRecordType | undefined> {
    const pk = CompanyRecord.makePk();
    const sk = CompanyRecord.makeSk(companyId);
    return await this.get(pk, sk);
  }
}

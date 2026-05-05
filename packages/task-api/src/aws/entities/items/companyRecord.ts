import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type CompanyAdditional = {
    timezone: string;
};

export type CompanyEntity = HierarchyEntityBase<"companyId", {}, CompanyAdditional>;
export type CompanyRecordProps = HierarchyRecordProps<"companyId", {}, CompanyAdditional>;
export type CompanyRecordType = HierarchyRecordType<"companyId", {}, CompanyAdditional>;

export const CompanyRecord = createHierarchyRecord<"companyId", {}, CompanyAdditional>({
    prefix: "Company",
    nameKey: "companyId",
    makeSkFn: (companyId: string) => `Company#${companyId}`,
    additionalKeys: ["timezone"],
});
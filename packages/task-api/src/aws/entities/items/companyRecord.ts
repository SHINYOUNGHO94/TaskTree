import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

export type CompanyEntity = HierarchyEntityBase<"Company">;
export type CompanyRecordProps = HierarchyRecordProps<"Company">;
export type CompanyRecordType = HierarchyRecordType<"Company">;

export const CompanyRecord = createHierarchyRecord<"Company">({
    entityName: "Company",
    makeSkFn: (companyId: string) => `Company#${companyId}`,
    additionalKeys: [],
});

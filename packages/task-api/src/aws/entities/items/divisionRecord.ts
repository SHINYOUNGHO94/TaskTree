import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DivisionHierarchy = {
    companyId: string;
};

export type DivisionEntity = HierarchyEntityBase<"divisionId", DivisionHierarchy>;
export type DivisionRecordProps = HierarchyRecordProps<"divisionId", DivisionHierarchy>;
export type DivisionRecordType = HierarchyRecordType<"divisionId", DivisionHierarchy>;

export const DivisionRecord = createHierarchyRecord<"divisionId", DivisionHierarchy>({
    prefix: "Division",
    nameKey: "divisionId",
    makeSkFn: (companyId: string, divisionId: string) => `Company#${companyId}#Division#${divisionId}`,
    hierarchyKeys: ["companyId"],
});
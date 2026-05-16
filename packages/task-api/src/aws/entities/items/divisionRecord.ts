import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DivisionHierarchy = {
    Company: string;
};

export type DivisionEntity = HierarchyEntityBase<"Division", DivisionHierarchy>;
export type DivisionRecordProps = HierarchyRecordProps<"Division", DivisionHierarchy>;
export type DivisionRecordType = HierarchyRecordType<"Division", DivisionHierarchy>;

export const DivisionRecord = createHierarchyRecord<"Division", DivisionHierarchy>({
    entityName: "Division",
    makeSkFn: (companyId: string, divisionId: string) => `Company#${companyId}#Division#${divisionId}`,
    hierarchyKeys: ["Company"],
});

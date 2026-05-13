import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DepartmentHierarchy = {
    Company: string;
    Division: string;
};

export type DepartmentEntity = HierarchyEntityBase<"Department", DepartmentHierarchy>;
export type DepartmentRecordProps = HierarchyRecordProps<"Department", DepartmentHierarchy>;
export type DepartmentRecordType = HierarchyRecordType<"Department", DepartmentHierarchy>;

export const DepartmentRecord = createHierarchyRecord<"Department", DepartmentHierarchy>({
    entityName: "Department",
    makeSkFn: (divisionId: string, departmentId: string) => `Division#${divisionId}#Department#${departmentId}`,
    hierarchyKeys: ["Company", "Division"],
});

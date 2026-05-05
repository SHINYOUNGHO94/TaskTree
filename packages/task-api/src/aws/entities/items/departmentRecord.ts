import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DepartmentHierarchy = {
    companyId: string;
    divisionId: string;
};

export type DepartmentEntity = HierarchyEntityBase<"departmentId", DepartmentHierarchy>;
export type DepartmentRecordProps = HierarchyRecordProps<"departmentId", DepartmentHierarchy>;
export type DepartmentRecordType = HierarchyRecordType<"departmentId", DepartmentHierarchy>;

export const DepartmentRecord = createHierarchyRecord<"departmentId", DepartmentHierarchy>({
    prefix: "Department",
    nameKey: "departmentId",
    makeSkFn: (divisionId: string, departmentId: string) => `Division#${divisionId}#Department#${departmentId}`,
    hierarchyKeys: ["companyId", "divisionId"],
});
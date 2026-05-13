import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DepartmentMemberHierarchy = {
    companyId: string;
    divisionId: string;
    departmentId: string;
};

type DepartmentMemberAdditional = {
    role: string;
    email: string;
};

export type DepartmentMemberEntity = HierarchyEntityBase<"DepartmentMember", DepartmentMemberHierarchy, DepartmentMemberAdditional>;
export type DepartmentMemberRecordProps = HierarchyRecordProps<"DepartmentMember", DepartmentMemberHierarchy, DepartmentMemberAdditional>;
export type DepartmentMemberRecordType = HierarchyRecordType<"DepartmentMember", DepartmentMemberHierarchy, DepartmentMemberAdditional>;

export const DepartmentMemberRecord = createHierarchyRecord<
    "DepartmentMember", DepartmentMemberHierarchy, DepartmentMemberAdditional
>({
    entityName: "DepartmentMember",
    makeSkFn: (departmentId: string, memberId: string) => `Department#${departmentId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId"],
    additionalKeys: ["role", "email"],
});

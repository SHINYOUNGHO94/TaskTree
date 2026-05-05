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

export type DepartmentMemberEntity = HierarchyEntityBase<"memberId", DepartmentMemberHierarchy, DepartmentMemberAdditional>;
export type DepartmentMemberRecordProps = HierarchyRecordProps<"memberId", DepartmentMemberHierarchy, DepartmentMemberAdditional>;
export type DepartmentMemberRecordType = HierarchyRecordType<"memberId", DepartmentMemberHierarchy, DepartmentMemberAdditional>;

export const DepartmentMemberRecord = createHierarchyRecord<
    "memberId", DepartmentMemberHierarchy, DepartmentMemberAdditional
>({
    prefix: "DepartmentMember",
    nameKey: "memberId",
    makeSkFn: (departmentId: string, memberId: string) => `Department#${departmentId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId"],
    additionalKeys: ["role", "email"],
});

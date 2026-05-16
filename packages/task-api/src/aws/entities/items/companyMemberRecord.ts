import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type CompanyMemberHierarchy = {
    companyId: string;
};

type CompanyMemberAdditional = {
    role: string;
    email: string;
};

export type CompanyMemberEntity = HierarchyEntityBase<"CompanyMember", CompanyMemberHierarchy, CompanyMemberAdditional>;
export type CompanyMemberRecordProps = HierarchyRecordProps<"CompanyMember", CompanyMemberHierarchy, CompanyMemberAdditional>;
export type CompanyMemberRecordType = HierarchyRecordType<"CompanyMember", CompanyMemberHierarchy, CompanyMemberAdditional>;

export const CompanyMemberRecord = createHierarchyRecord<
    "CompanyMember", CompanyMemberHierarchy, CompanyMemberAdditional
>({
    entityName: "CompanyMember",
    makeSkFn: (companyId: string, memberId: string) => `Company#${companyId}#Member#${memberId}`,
    hierarchyKeys: ["companyId"],
    additionalKeys: ["role", "email"],
});

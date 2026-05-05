import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type CompanyMemberHierarchy = {
    companyId: string;
};

type CompanyMemberAdditional = {
    role: string;
    email: string;
};

export type CompanyMemberEntity = HierarchyEntityBase<"memberId", CompanyMemberHierarchy, CompanyMemberAdditional>;
export type CompanyMemberRecordProps = HierarchyRecordProps<"memberId", CompanyMemberHierarchy, CompanyMemberAdditional>;
export type CompanyMemberRecordType = HierarchyRecordType<"memberId", CompanyMemberHierarchy, CompanyMemberAdditional>;

export const CompanyMemberRecord = createHierarchyRecord<
    "memberId", CompanyMemberHierarchy, CompanyMemberAdditional
>({
    prefix: "CompanyMember",
    nameKey: "memberId",
    makeSkFn: (companyId: string, memberId: string) => `Company#${companyId}#Member#${memberId}`,
    hierarchyKeys: ["companyId"],
    additionalKeys: ["role", "email"],
});

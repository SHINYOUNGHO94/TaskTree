import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DivisionMemberHierarchy = {
    companyId: string;
    divisionId: string;
}

type DivisionMemberAdditional = {
    role: string;
    email: string;
}

export type DivisionMemberEntity = HierarchyEntityBase<"DivisionMember", DivisionMemberHierarchy, DivisionMemberAdditional>;
export type DivisionMemberRecordProps = HierarchyRecordProps<"DivisionMember", DivisionMemberHierarchy, DivisionMemberAdditional>;
export type DivisionMemberRecordType = HierarchyRecordType<"DivisionMember", DivisionMemberHierarchy, DivisionMemberAdditional>;

export const DivisionMemberRecord = createHierarchyRecord<
    "DivisionMember", DivisionMemberHierarchy, DivisionMemberAdditional
>({
    entityName: "DivisionMember",
    makeSkFn: (divisionId: string, memberId: string) => `Division#${divisionId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId"],
    additionalKeys: ["role", "email"],
});
import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type DivisionMemberHierarchy = {
    companyId: string;
    divisionId: string;
}

type DivisionMemberAdditional = {
    role: string;
    email: string;
}

export type DivisionMemberEntity = HierarchyEntityBase<"memberId", DivisionMemberHierarchy, DivisionMemberAdditional>;
export type DivisionMemberRecordProps = HierarchyRecordProps<"memberId", DivisionMemberHierarchy, DivisionMemberAdditional>;
export type DivisionMemberRecordType = HierarchyRecordType<"memberId", DivisionMemberHierarchy, DivisionMemberAdditional>;

export const DivisionMemberRecord = createHierarchyRecord<
    "memberId", DivisionMemberHierarchy, DivisionMemberAdditional
>({
    prefix: "DivisionMember",
    nameKey: "memberId",
    makeSkFn: (divisionId: string, memberId: string) => `Division#${divisionId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId"],
    additionalKeys: ["role", "email"],
});
import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type TeamMemberHierarchy = {
    companyId: string;
    divisionId: string;
    departmentId: string;
    teamId: string;
};

type TeamMemberAdditional = {
    role: string;
    email: string;
};

export type TeamMemberEntity = HierarchyEntityBase<"TeamMember", TeamMemberHierarchy, TeamMemberAdditional>;
export type TeamMemberRecordProps = HierarchyRecordProps<"TeamMember", TeamMemberHierarchy, TeamMemberAdditional>;
export type TeamMemberRecordType = HierarchyRecordType<"TeamMember", TeamMemberHierarchy, TeamMemberAdditional>;

export const TeamMemberRecord = createHierarchyRecord<"TeamMember", TeamMemberHierarchy, TeamMemberAdditional>({
    entityName: "TeamMember",
    makeSkFn: (teamId: string, memberId: string) => `Team#${teamId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId", "teamId"],
    additionalKeys: ["role", "email"],
});

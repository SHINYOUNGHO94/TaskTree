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

export type TeamMemberEntity = HierarchyEntityBase<"memberId", TeamMemberHierarchy, TeamMemberAdditional>;
export type TeamMemberRecordProps = HierarchyRecordProps<"memberId", TeamMemberHierarchy, TeamMemberAdditional>;
export type TeamMemberRecordType = HierarchyRecordType<"memberId", TeamMemberHierarchy, TeamMemberAdditional>;

export const TeamMemberRecord = createHierarchyRecord<"memberId", TeamMemberHierarchy, TeamMemberAdditional>({
    prefix: "TeamMember",
    nameKey: "memberId",
    makeSkFn: (teamId: string, memberId: string) => `Team#${teamId}#Member#${memberId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId", "teamId"],
    additionalKeys: ["role", "email"],
});

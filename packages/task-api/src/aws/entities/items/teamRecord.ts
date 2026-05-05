import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type TeamHierarchy = {
    companyId: string;
    divisionId: string;
    departmentId: string;
};

export type TeamEntity = HierarchyEntityBase<"teamId", TeamHierarchy>;
export type TeamRecordProps = HierarchyRecordProps<"teamId", TeamHierarchy>;
export type TeamRecordType = HierarchyRecordType<"teamId", TeamHierarchy>;

export const TeamRecord = createHierarchyRecord<"teamId", TeamHierarchy>({
    prefix: "Team",
    nameKey: "teamId",
    makeSkFn: (departmentId: string, teamId: string) => `Department#${departmentId}#Team#${teamId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId"],
});

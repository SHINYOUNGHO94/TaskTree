import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";

type TeamHierarchy = {
    Company: string;
    Division: string;
    Department: string;
};

export type TeamEntity = HierarchyEntityBase<"Team", TeamHierarchy>;
export type TeamRecordProps = HierarchyRecordProps<"Team", TeamHierarchy>;
export type TeamRecordType = HierarchyRecordType<"Team", TeamHierarchy>;

export const TeamRecord = createHierarchyRecord<"Team", TeamHierarchy>({
    entityName: "Team",
    makeSkFn: (departmentId: string, teamId: string) => `Department#${departmentId}#Team#${teamId}`,
    hierarchyKeys: ["Company", "Division", "Department"],
});

import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";
import { UserRole } from "@task/core";

type UserHierarchy = {
    companyId: string;
    divisionId: string;
    departmentId: string;
    teamId: string;
};

type UserAdditional = {
    email: string;
    role: UserRole;
};

export type UserEntity = HierarchyEntityBase<"User", UserHierarchy, UserAdditional>;
export type UserRecordProps = HierarchyRecordProps<"User", UserHierarchy, UserAdditional>;
export type UserRecordType = HierarchyRecordType<"User", UserHierarchy, UserAdditional>;

export const UserRecord = createHierarchyRecord<"User", UserHierarchy, UserAdditional>({
    entityName: "User",
    makeSkFn: (teamId: string, userId: string) => `Team#${teamId}#User#${userId}`,
    hierarchyKeys: ["companyId", "divisionId", "departmentId", "teamId"],
    additionalKeys: ["email", "role"],
});

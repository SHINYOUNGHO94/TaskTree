import { createHierarchyRecord, HierarchyEntityBase, HierarchyRecordProps, HierarchyRecordType } from "./baseRecord";
import { AccessScope, TaskLevel, TaskStatus, TaskDetail } from "@task/core";

type TaskHierarchy = {
    Company: string;
    Division: string;
    Department: string;
    Team: string;
    Member: string;
};

type TaskAdditional = {
    creatorId: string;
    accessScope: AccessScope;
    status: TaskStatus;
    level: TaskLevel;
    limitDate: string;
    content: string;
};

export type TaskEntity = HierarchyEntityBase<"Task", TaskHierarchy, TaskAdditional>;
export type TaskRecordProps = HierarchyRecordProps<"Task", TaskHierarchy, TaskAdditional>;
export type TaskRecordType = HierarchyRecordType<"Task", TaskHierarchy, TaskAdditional>;

export const TaskRecord = {
    ...createHierarchyRecord<"Task", TaskHierarchy, TaskAdditional>({
        entityName: "Task",
        makeSkFn: (memberId: string, taskId: string) => `Member#${memberId}#Task#${taskId}`,
        hierarchyKeys: ["Company", "Division", "Department", "Team", "Member"],
        additionalKeys: ["creatorId", "accessScope", "status", "level", "limitDate", "content"],
    }),

    fromDetail: (detail: TaskDetail): TaskRecordType => {
        const entity: TaskEntity = {
            pk: TaskRecord.makePk(),
            sk: TaskRecord.makeSk(detail.memberId, detail.id),
            Task: detail.id,
            name: detail.title,
            at: detail.createdAt,
            update_at: detail.updatedAt,
            Company: detail.companyId,
            Division: detail.divisionId,
            Department: detail.departmentId,
            Team: detail.teamId,
            Member: detail.memberId,
            creatorId: detail.creatorId,
            accessScope: detail.accessScope,
            status: detail.status,
            level: detail.level,
            limitDate: detail.limitDate,
            content: detail.content,
        };
        return TaskRecord.fromEntity(entity);
    },

    toDetail: (record: TaskRecordType): TaskDetail => {
        const entity = TaskRecord.toEntity(record);
        return {
            id: entity.Task,
            title: entity.name,
            createdAt: entity.at,
            updatedAt: entity.update_at || entity.at,
            companyId: entity.Company,
            divisionId: entity.Division,
            departmentId: entity.Department,
            teamId: entity.Team,
            memberId: entity.Member,
            creatorId: entity.creatorId,
            accessScope: entity.accessScope,
            status: entity.status,
            level: entity.level,
            limitDate: entity.limitDate,
            content: entity.content,
        };
    }
} as const;

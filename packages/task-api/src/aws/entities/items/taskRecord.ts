import { TaskDetail } from "@task/core";
import { DynamoDBRecord } from "./DynamoDBRecord";

export interface TaskRecordProps extends TaskDetail { }

export type TaskRecordType = DynamoDBRecord & TaskRecordProps;

export const TaskRecord = {
    prefix: "Task",
    makePk: () => TaskRecord.prefix,
    makeSk: (memberId: string, taskId: string) => `Member#${memberId}#Task#${taskId}`,
    fromEntity: (entity: TaskDetail): TaskRecordType => ({
        ...entity,
        pk: TaskRecord.makePk(),
        sk: TaskRecord.makeSk(entity.memberId, entity.id),
    }),
    intoEntity: (record: TaskRecordType): TaskDetail => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pk, sk, ...rest } = record;
        return rest as TaskDetail;
    },
} as const;

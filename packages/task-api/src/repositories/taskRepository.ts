import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./baseRepository";
import { TaskRecord, TaskRecordType } from "@/aws/entities/items/taskRecord";
import { TaskDetail } from "@task/core";

// タスクデータの永続化を担当するリポジトリクラス
export class TaskRepository extends BaseRepository<TaskRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 指定された担当者(memberId)のタスク一覧を取得する
  async listByMemberId(memberId: string): Promise<TaskDetail[]> {
    const pk = TaskRecord.makePk();
    const skPrefix = `Member#${memberId}#`;

    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":sk": skPrefix,
        },
      })
    );

    const items = (response.Items as TaskRecordType[]) || [];
    return items.map((item) => TaskRecord.intoEntity(item));
  }

  async save(task: TaskDetail): Promise<void> {
    const record = TaskRecord.fromEntity(task);
    await this.put(record);
  }
}

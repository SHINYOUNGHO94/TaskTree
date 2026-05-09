import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BaseRepository } from "./baseRepository";
import { TaskRecord, TaskRecordType } from "@/aws/entities/items/taskRecord";
import { TaskDetail } from "@task/core";

// タスクデータの永続化を担当するリポジトリクラス
export class TaskRepository extends BaseRepository<TaskRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  // 指定された担当者のタスク一覧を取得する
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

  // 会社に属する全タスクを取得する 
  async listByCompanyId(companyId: string): Promise<TaskDetail[]> {
    const response = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "pk = :pk AND companyId = :companyId",
        ExpressionAttributeValues: {
          ":pk": TaskRecord.prefix,
          ":companyId": companyId,
        },
      })
    );
    const items = (response.Items as TaskRecordType[]) || [];
    return items.map((item) => TaskRecord.intoEntity(item));
  }

  // タスクIDのみでタスクを取得する
  async findByTaskId(taskId: string): Promise<TaskDetail | undefined> {
    const response = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "pk = :pk AND id = :taskId",
        ExpressionAttributeValues: {
          ":pk": TaskRecord.prefix,
          ":taskId": taskId,
        },
      })
    );
    const item = (response.Items as TaskRecordType[])?.[0];
    return item ? TaskRecord.intoEntity(item) : undefined;
  }

  async save(task: TaskDetail): Promise<void> {
    const record = TaskRecord.fromEntity(task);
    await this.put(record);
  }

  // 特定のタスクを1件取得する
  async findById(memberId: string, taskId: string): Promise<TaskDetail | undefined> {
    const pk = TaskRecord.makePk();
    const sk = TaskRecord.makeSk(memberId, taskId);
    const record = await super.get(pk, sk);
    return record ? TaskRecord.intoEntity(record) : undefined;
  }

  // 特定のタスクを削除する
  async delete(memberId: string, taskId: string): Promise<void> {
    const pk = TaskRecord.makePk();
    const sk = TaskRecord.makeSk(memberId, taskId);
    await super.delete(pk, sk);
  }
}

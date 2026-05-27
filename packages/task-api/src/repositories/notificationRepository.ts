import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Notification } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { NotificationRecord, NotificationRecordType } from "@/aws/entities/items/notificationRecord";

export class NotificationRepository extends BaseRepository<NotificationRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(notif: Notification): Promise<void> {
    const record = NotificationRecord.fromNotification(notif);
    await this.put(record);
  }

  async findByRecipient(recipientId: string, limit = 50): Promise<Notification[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": NotificationRecord.makePk(recipientId),
          ":prefix": "Notification#",
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    const items = (response.Items ?? []) as NotificationRecordType[];
    return items.map(NotificationRecord.toNotification);
  }

  async markRead(recipientId: string, notificationId: string, companyId: string): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: NotificationRecord.makePk(recipientId),
          sk: NotificationRecord.makeSk(notificationId),
        },
        UpdateExpression: "SET isRead = :true",
        ConditionExpression: "attribute_exists(pk) AND recipientId = :recipientId AND companyId = :companyId",
        ExpressionAttributeValues: {
          ":true": true,
          ":recipientId": recipientId,
          ":companyId": companyId,
        },
      }),
    );
  }
}

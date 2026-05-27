import { Notification } from "@task/core";

export interface NotificationRecordType {
  pk: string;
  sk: string;
  notificationId: string;
  recipientId: string;
  companyId: string;
  caseId: string;
  caseTitle: string;
  actorId: string;
  action: string;
  detail: string;
  isRead: boolean;
  at: string;
}

const makePk = (recipientId: string) => `User#${recipientId}#Notification`;
const makeSk = (notificationId: string) => `Notification#${notificationId}`;

const fromNotification = (notif: Notification): NotificationRecordType => ({
  pk: makePk(notif.recipientId),
  sk: makeSk(notif.notificationId),
  notificationId: notif.notificationId,
  recipientId: notif.recipientId,
  companyId: notif.companyId,
  caseId: notif.caseId,
  caseTitle: notif.caseTitle,
  actorId: notif.actorId,
  action: notif.action,
  detail: notif.detail,
  isRead: notif.isRead,
  at: notif.createdAt,
});

const toNotification = (record: NotificationRecordType): Notification => ({
  notificationId: record.notificationId,
  recipientId: record.recipientId,
  companyId: record.companyId,
  caseId: record.caseId,
  caseTitle: record.caseTitle,
  actorId: record.actorId,
  action: record.action as Notification["action"],
  detail: record.detail,
  isRead: record.isRead,
  createdAt: record.at,
});

export const NotificationRecord = {
  makePk,
  makeSk,
  fromNotification,
  toNotification,
} as const;

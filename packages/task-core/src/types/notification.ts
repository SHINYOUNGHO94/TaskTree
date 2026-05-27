export enum NotificationAction {
  COMMENT_ADDED = "COMMENT_ADDED",
  STATUS_CHANGED = "STATUS_CHANGED",
}

export interface Notification {
  notificationId: string;
  recipientId: string;
  companyId: string;
  caseId: string;
  caseTitle: string;
  actorId: string;
  action: NotificationAction;
  detail: string;
  isRead: boolean;
  createdAt: string;
}

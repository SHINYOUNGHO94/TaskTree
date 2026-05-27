import { randomUUID } from "crypto";
import { CaseOwnerType, NotificationAction } from "@task/core";
import { NotificationRepository } from "@/repositories/notificationRepository";

interface CaseForNotification {
  caseId: string;
  title: string;
  companyId: string;
  creatorId: string;
  ownerType: CaseOwnerType;
  ownerId: string;
}

export const saveNotificationsForCase = async (
  notifRepo: NotificationRepository,
  caseDetail: CaseForNotification,
  actorId: string,
  action: NotificationAction,
  detail: string,
  now: string,
): Promise<void> => {
  const recipients = new Set<string>();
  recipients.add(caseDetail.creatorId);
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId) {
    recipients.add(caseDetail.ownerId);
  }
  recipients.delete(actorId);

  if (recipients.size === 0) return;

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      notifRepo.save({
        notificationId: `${Date.parse(now)}_${randomUUID()}`,
        recipientId,
        companyId: caseDetail.companyId,
        caseId: caseDetail.caseId,
        caseTitle: caseDetail.title,
        actorId,
        action,
        detail,
        isRead: false,
        createdAt: now,
      }),
    ),
  );
};

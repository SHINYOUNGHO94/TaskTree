import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseHistoryAction, CaseStatus, NotificationAction } from "@task/core";

import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canEditCase } from "@/services/casePermissionService";
import { saveNotificationsForCase } from "@/services/notificationHelperService";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface UpdateCaseDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  assignmentRepo: CaseAssignmentRepository;
  visibilityRepo: CaseVisibilityRepository;
  notifRepo: NotificationRepository;
  userRepo: UserRepository;
}

const saveCaseAndAccessRecords = async (
  deps: Pick<UpdateCaseDeps, "caseRepo" | "assignmentRepo" | "visibilityRepo">,
  caseDetail: CaseDetail,
): Promise<void> => {
  if (typeof deps.caseRepo.saveWithAccessRecords === "function") {
    await deps.caseRepo.saveWithAccessRecords(caseDetail);
    return;
  }

  await deps.caseRepo.save(caseDetail);
  await Promise.all([
    deps.assignmentRepo.save(caseDetail),
    deps.visibilityRepo.save(caseDetail),
  ]);
};

export const createHandler =
  (deps: UpdateCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) {
        return badRequest("Request body is required");
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["status", "title", "description", "descriptionFormat", "descriptionText", "dueDate"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Only status, title, description, descriptionFormat, descriptionText, and dueDate can be updated");
      }

      const { status, title, description, descriptionFormat, descriptionText, dueDate } = body;

      if (
        status === undefined &&
        title === undefined &&
        description === undefined &&
        descriptionFormat === undefined &&
        descriptionText === undefined &&
        dueDate === undefined
      ) {
        return badRequest("At least one field must be provided");
      }

      if (
        status !== undefined &&
        !(Object.values(CaseStatus) as string[]).includes(status as string)
      ) {
        return badRequest("Invalid status value");
      }
      if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        return badRequest("Title must be a non-empty string");
      }
      if (description !== undefined && typeof description !== "string") {
        return badRequest("Description must be a string");
      }
      if (descriptionFormat !== undefined && descriptionFormat !== "plain" && descriptionFormat !== "tiptap_json") {
        return badRequest("descriptionFormat must be 'plain' or 'tiptap_json'");
      }
      if (descriptionText !== undefined && typeof descriptionText !== "string") {
        return badRequest("descriptionText must be a string");
      }
      if (dueDate !== undefined && dueDate !== null) {
        if (typeof dueDate !== "string") {
          return badRequest("dueDate must be a string or null");
        }
        const parsedDate = new Date(dueDate);
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
          isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== dueDate
        ) {
          return badRequest("dueDate must be a valid date in YYYY-MM-DD format");
        }
      }

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (!canEditCase(existingCase, userId, profile)) {
        return forbidden("You do not have permission to update this case");
      }

      const newStatus = status !== undefined ? (status as CaseStatus) : existingCase.status;

      if (status !== undefined && newStatus === CaseStatus.COMPLETED) {
        const children = await deps.caseRepo.findChildrenByParentCaseId(existingCase.caseId);
        const incomplete = children.filter(
          (c) => c.status !== CaseStatus.COMPLETED && c.status !== CaseStatus.CANCELED,
        );
        if (incomplete.length > 0) {
          return badRequest("All sub-cases must be completed before completing this case");
        }
      }

      const now = new Date().toISOString();
      const updatedCase: CaseDetail = {
        ...existingCase,
        ...(title !== undefined ? { title: (title as string).trim() } : {}),
        ...(description !== undefined ? { description: description as string } : {}),
        ...(descriptionFormat !== undefined ? { descriptionFormat: descriptionFormat as "plain" | "tiptap_json" } : {}),
        ...(descriptionText !== undefined ? { descriptionText: descriptionText as string } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate as string | null } : {}),
        status: newStatus,
        updatedAt: now,
      };

      await saveCaseAndAccessRecords(deps, updatedCase);

      try {
        if (status !== undefined && newStatus !== existingCase.status) {
          await deps.caseHistoryRepo.save({
            historyId: randomUUID(),
            caseId,
            companyId: profile.companyId,
            actorId: userId,
            action: CaseHistoryAction.STATUS_CHANGED,
            detail: `Status changed from ${existingCase.status} to ${newStatus}`,
            createdAt: now,
          });
        }
        const fieldChanges: string[] = [];
        if (title !== undefined) fieldChanges.push(`title updated`);
        if (description !== undefined) fieldChanges.push(`description updated`);
        if (dueDate !== undefined) fieldChanges.push(`dueDate updated to ${dueDate ?? "none"}`);
        if (fieldChanges.length > 0) {
          await deps.caseHistoryRepo.save({
            historyId: randomUUID(),
            caseId,
            companyId: profile.companyId,
            actorId: userId,
            action: CaseHistoryAction.CASE_UPDATED,
            detail: fieldChanges.join(", "),
            createdAt: now,
          });
        }
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      if (status !== undefined && newStatus !== existingCase.status) {
        try {
          await saveNotificationsForCase(
            deps.notifRepo,
            updatedCase,
            userId,
            NotificationAction.STATUS_CHANGED,
            `Status changed to ${newStatus}`,
            now,
          );
        } catch (notifError) {
          console.error("Failed to save notifications", notifError);
        }
      }

      if (status !== undefined && newStatus === CaseStatus.COMPLETED && existingCase.parentCaseId) {
        try {
          const siblings = await deps.caseRepo.findChildrenByParentCaseId(existingCase.parentCaseId);
          const allSiblingsDone = siblings.every(
            (s) =>
              s.caseId === existingCase.caseId
                ? true
                : s.status === CaseStatus.COMPLETED || s.status === CaseStatus.CANCELED,
          );
          if (allSiblingsDone) {
            const parentCase = await deps.caseRepo.findById(existingCase.parentCaseId);
            if (
              parentCase &&
              parentCase.status !== CaseStatus.COMPLETED &&
              parentCase.status !== CaseStatus.REVIEW_REQUESTED &&
              parentCase.status !== CaseStatus.CANCELED
            ) {
              const parentNow = new Date().toISOString();
              const updatedParent = {
                ...parentCase,
                status: CaseStatus.REVIEW_REQUESTED,
                updatedAt: parentNow,
              };
              await saveCaseAndAccessRecords(deps, updatedParent);
              await deps.caseHistoryRepo.save({
                historyId: randomUUID(),
                caseId: parentCase.caseId,
                companyId: parentCase.companyId,
                actorId: userId,
                action: CaseHistoryAction.STATUS_CHANGED,
                detail: `Status auto-changed to REVIEW_REQUESTED: all sub-cases completed`,
                createdAt: parentNow,
              });
            }
          }
        } catch (propagationError) {
          console.error("Failed to propagate completion to parent case", propagationError);
        }
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  assignmentRepo: new CaseAssignmentRepository(tableName),
  visibilityRepo: new CaseVisibilityRepository(tableName),
  notifRepo: new NotificationRepository(tableName),
  userRepo: new UserRepository(tableName),
});

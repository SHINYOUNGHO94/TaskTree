import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseHistoryAction, CaseOwnerType, CaseTaskStatus, UserRole } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface UpdateCaseTaskDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  caseTaskRepo: CaseTaskRepository;
  userRepo: UserRepository;
}

const VALID_STATUSES = new Set<string>(Object.values(CaseTaskStatus));

const canManageCaseOwner = (
  profile: {
    role: UserRole;
    divisionId?: string;
    departmentId?: string;
    teamId?: string;
  },
  caseDetail: CaseDetail,
): boolean => {
  if (profile.role === UserRole.COMPANY_ADMIN && caseDetail.ownerType === CaseOwnerType.COMPANY) {
    return true;
  }
  if (caseDetail.ownerType === CaseOwnerType.DIVISION) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.DEPARTMENT) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.TEAM) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId) ||
      (profile.role === UserRole.TEAM_ADMIN && caseDetail.teamId === profile.teamId)
    );
  }
  return false;
};

export const createHandler =
  (deps: UpdateCaseTaskDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      const taskId = event.pathParameters?.taskId;
      if (!caseId || !taskId) return notFound("Case or task not found");

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) return invalidRequestBody();

      const allowedFields = new Set(["title", "description", "status", "assigneeId", "dueDate"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Only title, description, status, assigneeId, and dueDate can be provided");
      }

      if (Object.keys(body).length === 0) {
        return badRequest("At least one field must be provided");
      }

      if ("title" in body && (typeof body.title !== "string" || !body.title.trim())) {
        return badRequest("title must be a non-empty string");
      }
      if ("description" in body && typeof body.description !== "string") {
        return badRequest("description must be a string");
      }
      if ("status" in body && (typeof body.status !== "string" || !VALID_STATUSES.has(body.status))) {
        return badRequest("Invalid status value");
      }
      if ("assigneeId" in body && body.assigneeId !== null && typeof body.assigneeId !== "string") {
        return badRequest("assigneeId must be a string or null");
      }
      if ("assigneeId" in body && typeof body.assigneeId === "string" && !body.assigneeId.trim()) {
        return badRequest("assigneeId must be a non-empty string or null");
      }
      if ("dueDate" in body && body.dueDate !== null && typeof body.dueDate !== "string") {
        return badRequest("dueDate must be a string or null");
      }

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      const existingTask = await deps.caseTaskRepo.findById(caseId, taskId);
      if (!existingTask) return notFound("Task not found");

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;
      const isTaskCreator = existingTask.creatorId === userId;
      const isTaskAssignee = existingTask.assigneeId === userId;
      const isOrgOwnerAdmin = canManageCaseOwner(profile, existingCase);

      if (!isCreator && !isUserOwner && !isOrgOwnerAdmin && !isTaskCreator && !isTaskAssignee) {
        return forbidden("You do not have permission to update this task");
      }

      const now = new Date().toISOString();
      const newStatus =
        "status" in body ? (body.status as CaseTaskStatus) : existingTask.status;
      const newAssigneeId =
        "assigneeId" in body
          ? (body.assigneeId as string | null)
          : existingTask.assigneeId;

      if (newAssigneeId) {
        const assigneeProfile = await deps.userRepo.findByUserId(newAssigneeId);
        if (!assigneeProfile || assigneeProfile.companyId !== existingCase.companyId) {
          return badRequest("assigneeId must be a user in the same company");
        }
      }

      const updatedTask = {
        ...existingTask,
        title: "title" in body ? (body.title as string).trim() : existingTask.title,
        description: "description" in body ? (body.description as string) : existingTask.description,
        status: newStatus,
        assigneeId: newAssigneeId,
        dueDate: "dueDate" in body ? (body.dueDate as string | null) : existingTask.dueDate,
        updatedAt: now,
      };

      await deps.caseTaskRepo.save(updatedTask);

      const statusChanged = newStatus !== existingTask.status;
      const assigneeChanged = newAssigneeId !== existingTask.assigneeId;

      const historyAction = statusChanged
        ? CaseHistoryAction.TASK_STATUS_CHANGED
        : assigneeChanged
          ? CaseHistoryAction.TASK_ASSIGNEE_CHANGED
          : CaseHistoryAction.TASK_UPDATED;

      const historyDetail = statusChanged
        ? `Task status changed: ${existingTask.status} → ${newStatus} (${updatedTask.title})`
        : assigneeChanged
          ? `Task assignee changed for: ${updatedTask.title}`
          : `Task updated: ${updatedTask.title}`;

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: existingCase.companyId,
          actorId: userId,
          action: historyAction,
          detail: historyDetail,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ taskId }),
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
  caseTaskRepo: new CaseTaskRepository(tableName),
  userRepo: new UserRepository(tableName),
});

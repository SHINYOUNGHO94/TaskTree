import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseHistoryAction, CaseOwnerType, CaseTaskDetail, CaseTaskStatus } from "@task/core";
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

export interface CreateCaseTaskDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  caseTaskRepo: CaseTaskRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: CreateCaseTaskDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["title", "description", "dueDate"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Only title, description, and dueDate can be provided");
      }

      const { title, description } = body;
      if (typeof title !== "string" || !title.trim()) {
        return badRequest("title is required");
      }
      if (typeof description !== "string") {
        return badRequest("description is required");
      }
      const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;

      if (!isCreator && !isUserOwner) {
        return forbidden("You do not have permission to create tasks for this case");
      }

      const now = new Date().toISOString();
      const task: CaseTaskDetail = {
        taskId: randomUUID(),
        caseId,
        companyId: existingCase.companyId,
        creatorId: userId,
        assigneeId: null,
        title: title.trim(),
        description,
        status: CaseTaskStatus.TODO,
        dueDate,
        createdAt: now,
        updatedAt: now,
      };

      await deps.caseTaskRepo.save(task);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: existingCase.companyId,
          actorId: userId,
          action: CaseHistoryAction.TASK_CREATED,
          detail: `Task created: ${task.title}`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ taskId: task.taskId }),
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

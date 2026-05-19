import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";
import { TaskDetail, TaskLevel, TaskStatus, UserRole } from "@task/core";

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface UpdateTaskDeps {
  taskRepo: TaskRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: UpdateTaskDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const callerId = event.requestContext.authorizer?.claims.sub;
      if (!callerId) return unauthorized();

      const taskId = event.pathParameters?.id;

      // JSON パースエラーは 500 ではなく 400 として返す
      let body: Record<string, unknown> | null = null;
      if (event.body) {
        try {
          body = JSON.parse(event.body) as Record<string, unknown>;
        } catch {
          return createResponse(400, { code: "INVALID_REQUEST_BODY", message: "Invalid request body" });
        }
      }

      if (!taskId || !body) {
        return createResponse(400, { code: "INVALID_REQUEST_BODY", message: "Missing required parameters" });
      }

      // status/level が指定された場合、列挙型の値であることを検証する（黙って無視しない）
      if (
        typeof body.status === "string" &&
        !(Object.values(TaskStatus) as string[]).includes(body.status)
      ) {
        return createResponse(400, { code: "INVALID_REQUEST_BODY", message: "Invalid status value" });
      }
      if (
        typeof body.level === "string" &&
        !(Object.values(TaskLevel) as string[]).includes(body.level)
      ) {
        return createResponse(400, { code: "INVALID_REQUEST_BODY", message: "Invalid level value" });
      }

      const existingTask = await deps.taskRepo.findByTaskId(taskId);
      if (!existingTask) {
        return createResponse(404, { code: "NOT_FOUND", message: "Task not found" });
      }

      // 権限チェック: 自分のタスク、または同一会社の COMPANY_ADMIN のみ更新可能
      const isOwner = existingTask.memberId === callerId;
      const callerProfile = await deps.userRepo.findByUserId(callerId);
      const isCompanyAdmin = callerProfile?.role === UserRole.COMPANY_ADMIN;

      if (!isOwner && !isCompanyAdmin) {
        return createResponse(403, {
          code: "FORBIDDEN",
          message: "Access denied. Only owners or company admins can edit.",
        });
      }

      // COMPANY_ADMIN であっても、異なる会社のタスクは更新不可
      if (isCompanyAdmin && callerProfile?.companyId !== existingTask.companyId) {
        return createResponse(403, {
          code: "FORBIDDEN",
          message: "Access denied. Admin can only edit tasks within their own company.",
        });
      }

      // 許可されたフィールドのみ上書きする。id/creatorId/memberId/companyId 等は変更不可
      const updatedTask: TaskDetail = {
        ...existingTask,
        ...(typeof body.title === "string" && body.title.trim() && { title: body.title.trim() }),
        ...(typeof body.content === "string" && { content: body.content }),
        ...(typeof body.status === "string" && { status: body.status as TaskStatus }),
        ...(typeof body.level === "string" && { level: body.level as TaskLevel }),
        ...(typeof body.limitDate === "string" &&
          body.limitDate.trim() && { limitDate: body.limitDate }),
        updatedAt: new Date().toISOString(),
      };

      await deps.taskRepo.save(updatedTask);

      return createResponse(200, updatedTask);
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  taskRepo: new TaskRepository(tableName),
  userRepo: new UserRepository(tableName),
});

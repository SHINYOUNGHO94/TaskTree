import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError } from "@/errors/utils";
import { UserRole } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const taskRepo = new TaskRepository(tableName);
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// タスクを削除するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const callerId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;

    if (!callerId || !taskId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // 削除前にタスクが存在するか確認
    const existingTask = await taskRepo.findByTaskId(taskId);
    if (!existingTask) {
      return createResponse(404, { message: "Task not found" });
    }

    // 権限チェック: 自分のタスク、または COMPANY_ADMIN のみ削除可能
    const isOwner = existingTask.memberId === callerId;
    const callerProfile = await userRepo.findByUserId(callerId);
    const isCompanyAdmin = callerProfile?.role === UserRole.COMPANY_ADMIN;

    if (!isOwner && !isCompanyAdmin) {
      return createResponse(403, { message: "Access denied. Only owners or company admins can delete." });
    }

    // タスク削除
    await taskRepo.delete(existingTask.memberId, taskId);

    return createResponse(200, { message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError } from "@/errors/utils";
import { TaskDetail, UserRole } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const taskRepo = new TaskRepository(tableName);
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// タスク情報を更新するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const memberId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;
    const body = event.body ? JSON.parse(event.body) : null;

    if (!memberId || !taskId || !body) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // 更新対象の存在確認
    const existingTask = await taskRepo.findByTaskId(taskId);
    if (!existingTask) {
      return createResponse(404, { message: "Task not found" });
    }

    // 権限チェック: 自分のタスク、または COMPANY_ADMIN のみ更新可能
    const isOwner = existingTask.memberId === memberId;
    const callerProfile = await userRepo.findByUserId(memberId);
    const isCompanyAdmin = callerProfile?.role === UserRole.COMPANY_ADMIN;

    if (!isOwner && !isCompanyAdmin) {
      return createResponse(403, { message: "Access denied. Only owners or company admins can edit." });
    }

    // 内容の更新
    const updatedTask: TaskDetail = {
      ...existingTask,
      ...body,
      memberId: existingTask.memberId,
      id: taskId, 
      updatedAt: new Date().toISOString(),
    };

    await taskRepo.save(updatedTask);

    return createResponse(200, updatedTask);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

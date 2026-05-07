import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError } from "@/errors/utils";
import { TaskDetail } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const repository = new TaskRepository(tableName);

// タスク情報を更新するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const memberId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;
    const body = event.body ? JSON.parse(event.body) : null;

    if (!memberId || !taskId || !body) {
      return internalServerError("Missing required parameters");
    }

    // 更新対象の存在確認
    const existingTask = await repository.findById(memberId, taskId);
    if (!existingTask) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Task not found" }),
      };
    }

    // 内容の更新（作成日などは維持）
    const updatedTask: TaskDetail = {
      ...existingTask,
      ...body,
      memberId, 
      id: taskId, 
      updatedAt: new Date().toISOString(),
    };

    await repository.save(updatedTask);

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(updatedTask),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

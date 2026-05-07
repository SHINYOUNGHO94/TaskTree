import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new TaskRepository(tableName);

// タスクを削除するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const memberId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;

    if (!memberId || !taskId) {
      return internalServerError("Missing memberId or taskId");
    }

    // 削除前にタスクが存在するか確認
    const existingTask = await repository.findById(memberId, taskId);
    if (!existingTask) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Task not found" }),
      };
    }

    // タスク削除
    await repository.delete(memberId, taskId);

    // レスポンス
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Task deleted successfully" }),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

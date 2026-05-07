import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new TaskRepository(tableName);

// タスク詳細を取得するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const memberId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;

    if (!memberId || !taskId) {
      return internalServerError("Missing memberId or taskId");
    }

    // タスク取得
    const task = await repository.findById(memberId, taskId);

    if (!task) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Task not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(task),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

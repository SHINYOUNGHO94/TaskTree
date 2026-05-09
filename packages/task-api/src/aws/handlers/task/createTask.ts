import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError, invalidRequestBody } from "@/errors/utils";
import { TaskDetail } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const repository = new TaskRepository(tableName);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 1. リクエストボディの確認
    if (!event.body) return invalidRequestBody();
    const task: TaskDetail = JSON.parse(event.body);
    
    // 2. ログイン中のユーザーIDを認証トークンから取得して設定
    const creatorId = event.requestContext.authorizer?.claims.sub;
    if (!creatorId) return internalServerError("Creator ID not found");
    
    task.creatorId = creatorId;

    // 3. リポジトリを使用してタスクを保存
    await repository.save(task);

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Success", id: task.id }),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

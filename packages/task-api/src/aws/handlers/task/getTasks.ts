import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new TaskRepository(tableName);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // ログイン中のユーザーID(memberId)を認証トークンから取得
    const memberId = event.requestContext.authorizer?.claims.sub;

    if (!memberId) return internalServerError("Member ID not found");
    // 担当者IDに紐づくタスク一覧を検索
    const tasks = await repository.listByMemberId(memberId);
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(tasks),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

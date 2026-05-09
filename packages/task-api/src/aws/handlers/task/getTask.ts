import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError } from "@/errors/utils";
import { AccessScope, UserRole } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const taskRepo = new TaskRepository(tableName);
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// タスク詳細を取得するLambdaハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const callerId = event.requestContext.authorizer?.claims.sub;
    const taskId = event.pathParameters?.id;

    if (!callerId || !taskId) {
      return createResponse(400, { message: "Missing required parameters" });
    }

    // タスクをIDのみで取得
    const task = await taskRepo.findByTaskId(taskId);
    if (!task) {
      return createResponse(404, { message: "Task not found" });
    }

    // 閲覧権限チェック: 呼び出し元のプロファイルを確認
    const callerProfile = await userRepo.findByUserId(callerId);
    if (!callerProfile) {
      return createResponse(404, { message: "User profile not found" });
    }

    const { role, companyId, divisionId, departmentId, teamId } = callerProfile;

    // 権限判定ロジック
    let canAccess = false;

    // PRIVATE: 所有者のみ
    if (task.accessScope === AccessScope.PRIVATE) {
      canAccess = task.memberId === callerId;
    }
    // COMPANY_ADMINまたは全社公開スコープ
    else if (role === UserRole.COMPANY_ADMIN || (task.accessScope === AccessScope.COMPANY && task.companyId === companyId)) {
      canAccess = task.companyId === companyId;
    }

    // DIVISION Scope: 本部長以上
    else if (task.accessScope === AccessScope.DIVISION) {
      canAccess = role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId;
    }
    // DEPARTMENT Scope: 部長以上
    else if (task.accessScope === AccessScope.DEPARTMENT) {
      const isDirectDeptAdmin = role === UserRole.DEPT_ADMIN && task.departmentId === departmentId;
      const isUpperAdmin = role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId;
      canAccess = isDirectDeptAdmin || isUpperAdmin;
    }
    // TEAM Scope: リーダー/メンバー、または上位管理者
    else if (task.accessScope === AccessScope.TEAM) {
      const isDirectTeamMember = task.teamId === teamId && teamId !== "NONE";
      const isDeptAdmin = role === UserRole.DEPT_ADMIN && task.departmentId === departmentId;
      const isDivAdmin = role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId;
      canAccess = isDirectTeamMember || isDeptAdmin || isDivAdmin;
    }

    // 作成者/担当者は無条件
    if (task.memberId === callerId || task.creatorId === callerId) {
      canAccess = true;
    }

    if (!canAccess) {
      return createResponse(403, { message: "Access denied" });
    }

    return createResponse(200, task);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

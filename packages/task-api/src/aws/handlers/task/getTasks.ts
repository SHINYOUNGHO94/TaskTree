import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError } from "@/errors/utils";
import { AccessScope, TaskDetail, UserRole } from "@task/core";

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ユーザーの権限と組織情報に基づいてタスクを絞り込む
const filterTasksByScope = (
  tasks: TaskDetail[],
  userId: string,
  role: string,
  companyId: string,
  divisionId: string,
  departmentId: string,
  teamId: string,
): TaskDetail[] => {
  return tasks.filter((task) => {
    // PRIVATE スコープの処理: 所有者本人のみ閲覧可能
    if (task.accessScope === AccessScope.PRIVATE) {
      return task.memberId === userId;
    }

    // COMPANY_ADMIN: 同じ会社の全タスクを閲覧可能
    if (role === UserRole.COMPANY_ADMIN) {
      return task.companyId === companyId;
    }

    // 全社公開タスク: 同じ会社なら全員閲覧可能
    if (task.accessScope === AccessScope.COMPANY) {
      return task.companyId === companyId;
    }
    
    // 本部レベルの判定: DIVISION_ADMIN 以上のみ
    if (task.accessScope === AccessScope.DIVISION) {
      if (role === UserRole.DIVISION_ADMIN || role === UserRole.COMPANY_ADMIN) {
        return task.divisionId === divisionId;
      }
      return false; // 下位ロールは閲覧不可
    }

    // 部署レベルの判定: DEPT_ADMIN 以上のみ
    if (task.accessScope === AccessScope.DEPARTMENT) {
      if (role === UserRole.DEPT_ADMIN || role === UserRole.DIVISION_ADMIN || role === UserRole.COMPANY_ADMIN) {
        return task.departmentId === departmentId || (role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId);
      }
      return false; // 下位ロールは閲覧不可
    }

    // チームレベルの判定: TEAM_ADMIN / USER 以上
    if (task.accessScope === AccessScope.TEAM) {
      // 自分のチームのタスクなら誰でも（メンバー・リーダー）閲覧可能
      if (task.teamId === teamId && teamId !== "NONE") return true;
      
      // 自分がそのチームの上位管理者（部長・本部長・社長）である場合
      if (role === UserRole.DEPT_ADMIN && task.departmentId === departmentId) return true;
      if (role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId) return true;
      if (role === UserRole.COMPANY_ADMIN) return true;

      return false;
    }

    // 自分が作成者または担当者なら閲覧可能
    if (task.memberId === userId || task.creatorId === userId) return true;

    return false;
  });
};

export interface GetTasksDeps {
  taskRepo: TaskRepository;
  userRepo: UserRepository;
}

export const createHandler = (deps: GetTasksDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const callerId = event.requestContext.authorizer?.claims.sub;
    if (!callerId) return internalServerError("Member ID not found");

    // ログインユーザーのプロファイルを取得し、権限と組織情報を確認する
    const callerProfile = await deps.userRepo.findByUserId(callerId);
    if (!callerProfile) return internalServerError("User profile not found");

    const { role, companyId, divisionId = "NONE", departmentId = "NONE", teamId = "NONE" } = callerProfile;

    // 全ロールで会社のタスクを取得し、filterTasksByScope で権限に応じて絞り込む
    const tasks = await deps.taskRepo.listByCompanyId(companyId);

    const filteredTasks = filterTasksByScope(
      tasks,
      callerId,
      role,
      companyId,
      divisionId,
      departmentId,
      teamId
    );

    return createResponse(200, filteredTasks);
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  taskRepo: new TaskRepository(tableName),
  userRepo: new UserRepository(tableName)
});

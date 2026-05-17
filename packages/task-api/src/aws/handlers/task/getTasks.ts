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
    // PRIVATE スコープ: 所有者本人のみ
    if (task.accessScope === AccessScope.PRIVATE) {
      return task.memberId === userId;
    }

    // COMPANY_ADMIN: 同じ会社の全タスク
    if (role === UserRole.COMPANY_ADMIN) {
      return task.companyId === companyId;
    }

    // 全社公開: 同じ会社なら全員閲覧可能
    if (task.accessScope === AccessScope.COMPANY) {
      return task.companyId === companyId;
    }

    // 本部レベル: DIVISION_ADMIN 以上のみ
    if (task.accessScope === AccessScope.DIVISION) {
      if (role === UserRole.DIVISION_ADMIN || role === UserRole.COMPANY_ADMIN) {
        return task.divisionId === divisionId;
      }
      return false;
    }

    // 部署レベル: DEPT_ADMIN 以上のみ
    if (task.accessScope === AccessScope.DEPARTMENT) {
      if (role === UserRole.DEPT_ADMIN || role === UserRole.DIVISION_ADMIN || role === UserRole.COMPANY_ADMIN) {
        return task.departmentId === departmentId || (role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId);
      }
      return false;
    }

    // チームレベル: TEAM_ADMIN / USER 以上
    if (task.accessScope === AccessScope.TEAM) {
      if (task.teamId === teamId && teamId !== "NONE") return true;
      if (role === UserRole.DEPT_ADMIN && task.departmentId === departmentId) return true;
      if (role === UserRole.DIVISION_ADMIN && task.divisionId === divisionId) return true;
      if (role === UserRole.COMPANY_ADMIN) return true;
      return false;
    }

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

    const callerProfile = await deps.userRepo.findByUserId(callerId);
    if (!callerProfile) return internalServerError("User profile not found");

    const { role, companyId, divisionId = "NONE", departmentId = "NONE", teamId = "NONE" } = callerProfile;

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

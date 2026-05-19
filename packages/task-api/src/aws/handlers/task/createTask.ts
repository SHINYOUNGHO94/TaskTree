import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import {
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  requiredFieldsMissing,
  unauthorized,
} from "@/errors/utils";
import { AccessScope, TaskDetail, TaskLevel, TaskStatus, UserRole } from "@task/core";

// ロールごとに許可される accessScope を定義する
const ALLOWED_SCOPES_BY_ROLE: Record<UserRole, AccessScope[]> = {
  [UserRole.COMPANY_ADMIN]: [AccessScope.PRIVATE, AccessScope.TEAM, AccessScope.DEPARTMENT, AccessScope.DIVISION, AccessScope.COMPANY],
  [UserRole.DIVISION_ADMIN]: [AccessScope.PRIVATE, AccessScope.TEAM, AccessScope.DEPARTMENT, AccessScope.DIVISION],
  [UserRole.DEPT_ADMIN]: [AccessScope.PRIVATE, AccessScope.TEAM, AccessScope.DEPARTMENT],
  [UserRole.TEAM_ADMIN]: [AccessScope.PRIVATE, AccessScope.TEAM],
  [UserRole.USER]: [AccessScope.PRIVATE],
  [UserRole.GUEST]: [AccessScope.PRIVATE],
};

export interface CreateTaskDeps {
  taskRepo: TaskRepository;
  userRepo: UserRepository;
  divisionRepo: DivisionRepository;
  deptRepo: DepartmentRepository;
  teamRepo: TeamRepository;
}

// クライアントから受け取れる作成フィールドの型（サーバー決定値は含まない）
interface CreateTaskBody {
  title?: unknown;
  content?: unknown;
  level?: unknown;
  limitDate?: unknown;
  accessScope?: unknown;
  memberId?: unknown;
  // PRIVATE 以外の公開範囲で、対象となる組織を指定するためのフィールド
  divisionId?: unknown;
  departmentId?: unknown;
  teamId?: unknown;
}

// 文字列かつ非空であることを確認する型ガード
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export const createHandler =
  (deps: CreateTaskDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) return invalidRequestBody();

      const creatorId = event.requestContext.authorizer?.claims.sub;
      if (!creatorId) return unauthorized();

      let body: CreateTaskBody;
      try {
        body = JSON.parse(event.body) as CreateTaskBody;
      } catch {
        return invalidRequestBody();
      }

      const { title, content, level, limitDate, accessScope, memberId } = body;

      // 必須フィールドおよび列挙型の値を検証する（status はサーバーで NOT_STARTED に固定）
      if (
        !isNonEmptyString(title) ||
        typeof content !== "string" ||
        typeof level !== "string" ||
        !(Object.values(TaskLevel) as string[]).includes(level) ||
        !isNonEmptyString(limitDate) ||
        !isNonEmptyString(accessScope) ||
        !(Object.values(AccessScope) as string[]).includes(accessScope) ||
        !isNonEmptyString(memberId)
      ) {
        return requiredFieldsMissing();
      }

      // 作成者プロフィールを取得して companyId を確定する（クライアントの値を信頼しない）
      const creatorProfile = await deps.userRepo.findByUserId(creatorId);
      if (!creatorProfile) {
        return internalServerError("Creator profile not found");
      }

      // 作成者のロールで許可された accessScope かを検証する
      const allowedScopes = ALLOWED_SCOPES_BY_ROLE[creatorProfile.role] ?? [AccessScope.PRIVATE];
      if (!allowedScopes.includes(accessScope as AccessScope)) {
        return forbidden("Your role does not allow this access scope");
      }

      // 担当者プロフィールを取得して存在と会社帰属を検証する
      const memberProfile = await deps.userRepo.findByUserId(memberId);
      if (!memberProfile) {
        return notFound("Assigned member not found");
      }
      if (memberProfile.companyId !== creatorProfile.companyId) {
        return forbidden("Assigned member must belong to the same company");
      }

      // accessScope に応じて組織 ID を決定し、存在と権限を検証する
      let resolvedDivisionId: string;
      let resolvedDepartmentId: string;
      let resolvedTeamId: string;

      if (accessScope === AccessScope.PRIVATE) {
        // PRIVATE: 担当者プロフィールの組織情報をそのまま使用（リポジトリ照会不要）
        resolvedDivisionId = memberProfile.divisionId;
        resolvedDepartmentId = memberProfile.departmentId;
        resolvedTeamId = memberProfile.teamId;
      } else if (accessScope === AccessScope.TEAM) {
        // TEAM: teamId と departmentId がボディに必須。チームの存在と権限を検証する
        if (!isNonEmptyString(body.teamId) || !isNonEmptyString(body.departmentId)) {
          return requiredFieldsMissing();
        }
        const team = await deps.teamRepo.findById(body.departmentId, body.teamId);
        if (!team) return notFound("Team not found");
        if (team.companyId !== creatorProfile.companyId) {
          return forbidden("Team belongs to a different company");
        }
        const role = creatorProfile.role;
        if (role === UserRole.TEAM_ADMIN && team.teamId !== creatorProfile.teamId) {
          return forbidden("TEAM_ADMIN can only create tasks for their own team");
        }
        if (role === UserRole.DEPT_ADMIN && team.departmentId !== creatorProfile.departmentId) {
          return forbidden("DEPT_ADMIN can only create tasks for teams within their department");
        }
        if (role === UserRole.DIVISION_ADMIN && team.divisionId !== creatorProfile.divisionId) {
          return forbidden("DIVISION_ADMIN can only create tasks for teams within their division");
        }
        resolvedDivisionId = team.divisionId;
        resolvedDepartmentId = team.departmentId;
        resolvedTeamId = team.teamId;
      } else if (accessScope === AccessScope.DEPARTMENT) {
        // DEPARTMENT: departmentId と divisionId がボディに必須。部署の存在と権限を検証する
        if (!isNonEmptyString(body.departmentId) || !isNonEmptyString(body.divisionId)) {
          return requiredFieldsMissing();
        }
        const dept = await deps.deptRepo.findById(body.divisionId, body.departmentId);
        if (!dept) return notFound("Department not found");
        if (dept.companyId !== creatorProfile.companyId) {
          return forbidden("Department belongs to a different company");
        }
        const role = creatorProfile.role;
        if (role === UserRole.DEPT_ADMIN && dept.departmentId !== creatorProfile.departmentId) {
          return forbidden("DEPT_ADMIN can only create tasks for their own department");
        }
        if (role === UserRole.DIVISION_ADMIN && dept.divisionId !== creatorProfile.divisionId) {
          return forbidden("DIVISION_ADMIN can only create tasks for departments within their division");
        }
        resolvedDivisionId = dept.divisionId;
        resolvedDepartmentId = dept.departmentId;
        resolvedTeamId = memberProfile.teamId;
      } else if (accessScope === AccessScope.DIVISION) {
        // DIVISION: divisionId がボディに必須。事業部の存在と権限を検証する
        if (!isNonEmptyString(body.divisionId)) {
          return requiredFieldsMissing();
        }
        const division = await deps.divisionRepo.findById(creatorProfile.companyId, body.divisionId);
        if (!division) return notFound("Division not found");
        if (creatorProfile.role === UserRole.DIVISION_ADMIN && division.divisionId !== creatorProfile.divisionId) {
          return forbidden("DIVISION_ADMIN can only create tasks for their own division");
        }
        resolvedDivisionId = division.divisionId;
        resolvedDepartmentId = memberProfile.departmentId;
        resolvedTeamId = memberProfile.teamId;
      } else {
        // COMPANY: ロール検証済み（COMPANY_ADMIN のみ）。担当者の組織情報をそのまま使用
        resolvedDivisionId = memberProfile.divisionId;
        resolvedDepartmentId = memberProfile.departmentId;
        resolvedTeamId = memberProfile.teamId;
      }

      const now = new Date().toISOString();
      const task: TaskDetail = {
        id: randomUUID(),
        title: title.trim(),
        content,
        // 新規タスクのステータスは常に NOT_STARTED とする（クライアント値を無視）
        status: TaskStatus.NOT_STARTED,
        level: level as TaskLevel,
        limitDate,
        accessScope: accessScope as AccessScope,
        memberId,
        creatorId,
        companyId: creatorProfile.companyId,
        divisionId: resolvedDivisionId,
        departmentId: resolvedDepartmentId,
        teamId: resolvedTeamId,
        createdAt: now,
        updatedAt: now,
      };

      await deps.taskRepo.save(task);

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

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  taskRepo: new TaskRepository(tableName),
  userRepo: new UserRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  teamRepo: new TeamRepository(tableName),
});

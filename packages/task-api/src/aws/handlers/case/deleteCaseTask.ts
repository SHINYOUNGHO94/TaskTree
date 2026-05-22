import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseHistoryAction, CaseOwnerType, UserRole } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface DeleteCaseTaskDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  caseTaskRepo: CaseTaskRepository;
  userRepo: UserRepository;
}

const canManageCaseOwner = (
  profile: {
    role: UserRole;
    divisionId?: string;
    departmentId?: string;
    teamId?: string;
  },
  caseDetail: CaseDetail,
): boolean => {
  if (profile.role === UserRole.COMPANY_ADMIN && caseDetail.ownerType === CaseOwnerType.COMPANY) {
    return true;
  }
  if (caseDetail.ownerType === CaseOwnerType.DIVISION) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.DEPARTMENT) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId)
    );
  }
  if (caseDetail.ownerType === CaseOwnerType.TEAM) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN && caseDetail.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN && caseDetail.departmentId === profile.departmentId) ||
      (profile.role === UserRole.TEAM_ADMIN && caseDetail.teamId === profile.teamId)
    );
  }
  return false;
};

export const createHandler =
  (deps: DeleteCaseTaskDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      const taskId = event.pathParameters?.taskId;
      if (!caseId || !taskId) return notFound("Case or task not found");

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      const existingTask = await deps.caseTaskRepo.findById(caseId, taskId);
      if (!existingTask) return notFound("Task not found");

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;
      const isTaskCreator = existingTask.creatorId === userId;
      const isTaskAssignee = existingTask.assigneeId === userId;
      const isOrgOwnerAdmin = canManageCaseOwner(profile, existingCase);

      if (!isCreator && !isUserOwner && !isOrgOwnerAdmin && !isTaskCreator && !isTaskAssignee) {
        return forbidden("You do not have permission to delete this task");
      }

      await deps.caseTaskRepo.remove(caseId, taskId);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: existingCase.companyId,
          actorId: userId,
          action: CaseHistoryAction.TASK_DELETED,
          detail: `Task deleted: ${existingTask.title}`,
          createdAt: new Date().toISOString(),
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 204,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "",
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  caseTaskRepo: new CaseTaskRepository(tableName),
  userRepo: new UserRepository(tableName),
});

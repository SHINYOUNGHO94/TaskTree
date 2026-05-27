import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  requiredFieldsMissing,
  unauthorized,
} from "@/errors/utils";
import {
  CaseDetail,
  CaseDeliveryType,
  CaseHistoryAction,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

const ALLOWED_TARGET_SCOPES_BY_ROLE: Record<UserRole, CaseTargetScope[]> = {
  [UserRole.COMPANY_ADMIN]: [
    CaseTargetScope.COMPANY,
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DIVISION_ADMIN]: [
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DEPT_ADMIN]: [
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.TEAM_ADMIN]: [CaseTargetScope.TEAM, CaseTargetScope.USER],
  [UserRole.USER]: [CaseTargetScope.USER],
  [UserRole.GUEST]: [CaseTargetScope.USER],
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const ALLOWED_ROOT_CASE_TYPES: string[] = [CaseType.REQUEST, CaseType.STANDARD, CaseType.PROJECT];

export interface CreateCaseDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  assignmentRepo: CaseAssignmentRepository;
  visibilityRepo: CaseVisibilityRepository;
  userRepo: UserRepository;
  divisionRepo: DivisionRepository;
  deptRepo: DepartmentRepository;
  teamRepo: TeamRepository;
}

interface CreateCaseBody {
  title?: unknown;
  description?: unknown;
  descriptionFormat?: unknown;
  descriptionText?: unknown;
  caseType?: unknown;
  deliveryType?: unknown;
  targetScope?: unknown;
  targetScopeId?: unknown;
  requiredRole?: unknown;
  dueDate?: unknown;
  projectId?: unknown;
  parentCaseId?: unknown;
}

const saveCaseAndAccessRecords = async (
  deps: Pick<CreateCaseDeps, "caseRepo" | "assignmentRepo" | "visibilityRepo">,
  caseDetail: CaseDetail,
): Promise<void> => {
  if (typeof deps.caseRepo.saveWithAccessRecords === "function") {
    await deps.caseRepo.saveWithAccessRecords(caseDetail);
    return;
  }

  await deps.caseRepo.save(caseDetail);
  await Promise.all([
    deps.assignmentRepo.save(caseDetail),
    deps.visibilityRepo.save(caseDetail),
  ]);
};

export const createHandler =
  (deps: CreateCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) return invalidRequestBody();

      const creatorId = event.requestContext.authorizer?.claims.sub;
      if (!creatorId) return unauthorized();

      let body: CreateCaseBody;
      try {
        body = JSON.parse(event.body) as CreateCaseBody;
      } catch {
        return invalidRequestBody();
      }

      if (body.projectId != null || body.parentCaseId != null) {
        return badRequest("projectId and parentCaseId are not supported in this version");
      }

      const { title, description, caseType, deliveryType, targetScope, targetScopeId, requiredRole } = body;

      if (
        !isNonEmptyString(title) ||
        !isNonEmptyString(description) ||
        !isNonEmptyString(caseType) ||
        !ALLOWED_ROOT_CASE_TYPES.includes(caseType) ||
        !isNonEmptyString(deliveryType) ||
        !(Object.values(CaseDeliveryType) as string[]).includes(deliveryType) ||
        !isNonEmptyString(targetScope) ||
        !(Object.values(CaseTargetScope) as string[]).includes(targetScope) ||
        !isNonEmptyString(targetScopeId) ||
        !isNonEmptyString(requiredRole) ||
        !(Object.values(UserRole) as string[]).includes(requiredRole)
      ) {
        return requiredFieldsMissing();
      }

      if (
        body.descriptionFormat !== undefined &&
        body.descriptionFormat !== "plain" &&
        body.descriptionFormat !== "tiptap_json"
      ) {
        return badRequest("descriptionFormat must be 'plain' or 'tiptap_json'");
      }

      const creatorProfile = await deps.userRepo.findByUserId(creatorId);
      if (!creatorProfile) return internalServerError("Creator profile not found");

      const allowedScopes = ALLOWED_TARGET_SCOPES_BY_ROLE[creatorProfile.role] ?? [];
      if (!allowedScopes.includes(targetScope as CaseTargetScope)) {
        return forbidden("Your role does not allow this target scope");
      }

      if (ROLE_RANK[requiredRole as UserRole] > ROLE_RANK[creatorProfile.role]) {
        return forbidden("requiredRole cannot exceed creator's role");
      }

      const typedScope = targetScope as CaseTargetScope;

      if (typedScope === CaseTargetScope.COMPANY) {
        if (targetScopeId !== creatorProfile.companyId) {
          return forbidden("targetScopeId must match your companyId for COMPANY scope");
        }
      } else if (typedScope === CaseTargetScope.DIVISION) {
        const division = await deps.divisionRepo.findById(creatorProfile.companyId, targetScopeId);
        if (!division) return notFound("Division not found");
        if (
          creatorProfile.role === UserRole.DIVISION_ADMIN &&
          division.divisionId !== creatorProfile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target their own division");
        }
      } else if (typedScope === CaseTargetScope.DEPARTMENT) {
        const departments = await deps.deptRepo.findByCompanyId(creatorProfile.companyId);
        const dept = departments.find((d) => d.departmentId === targetScopeId);
        if (!dept) return notFound("Department not found");
        if (
          creatorProfile.role === UserRole.DIVISION_ADMIN &&
          dept.divisionId !== creatorProfile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target departments within their division");
        }
        if (
          creatorProfile.role === UserRole.DEPT_ADMIN &&
          dept.departmentId !== creatorProfile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target their own department");
        }
      } else if (typedScope === CaseTargetScope.TEAM) {
        const teams = await deps.teamRepo.findByCompanyId(creatorProfile.companyId);
        const team = teams.find((t) => t.teamId === targetScopeId);
        if (!team) return notFound("Team not found");
        if (
          creatorProfile.role === UserRole.DIVISION_ADMIN &&
          team.divisionId !== creatorProfile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target teams within their division");
        }
        if (
          creatorProfile.role === UserRole.DEPT_ADMIN &&
          team.departmentId !== creatorProfile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target teams within their department");
        }
        if (
          creatorProfile.role === UserRole.TEAM_ADMIN &&
          team.teamId !== creatorProfile.teamId
        ) {
          return forbidden("TEAM_ADMIN can only target their own team");
        }
      } else if (typedScope === CaseTargetScope.USER) {
        const targetUser = await deps.userRepo.findByUserId(targetScopeId);
        if (!targetUser) return notFound("Target user not found");
        if (targetUser.companyId !== creatorProfile.companyId) {
          return forbidden("Target user belongs to a different company");
        }
        if (
          creatorProfile.role === UserRole.DIVISION_ADMIN &&
          targetUser.divisionId !== creatorProfile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target users within their division");
        }
        if (
          creatorProfile.role === UserRole.DEPT_ADMIN &&
          targetUser.departmentId !== creatorProfile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target users within their department");
        }
        if (
          creatorProfile.role === UserRole.TEAM_ADMIN &&
          targetUser.teamId !== creatorProfile.teamId
        ) {
          return forbidden("TEAM_ADMIN can only target users within their team");
        }
        if (
          (creatorProfile.role === UserRole.USER || creatorProfile.role === UserRole.GUEST) &&
          targetUser.User !== creatorId
        ) {
          return forbidden("Users can only target themselves");
        }
      }

      const now = new Date().toISOString();
      const caseDetail: CaseDetail = {
        caseId: randomUUID(),
        title: title.trim(),
        description: description.trim(),
        ...(typeof body.descriptionFormat === "string" && (body.descriptionFormat === "plain" || body.descriptionFormat === "tiptap_json")
          ? { descriptionFormat: body.descriptionFormat as "plain" | "tiptap_json" }
          : {}),
        ...(typeof body.descriptionText === "string" ? { descriptionText: body.descriptionText } : {}),
        caseType: caseType as CaseType,
        status: CaseStatus.WAITING,
        deliveryType: deliveryType as CaseDeliveryType,
        ownerType: CaseOwnerType.USER,
        ownerId: creatorId,
        targetScope: typedScope,
        targetScopeId,
        requiredRole: requiredRole as UserRole,
        companyId: creatorProfile.companyId,
        divisionId: creatorProfile.divisionId,
        departmentId: creatorProfile.departmentId,
        teamId: creatorProfile.teamId,
        creatorId,
        projectId: null,
        parentCaseId: null,
        dueDate: isNonEmptyString(body.dueDate) ? body.dueDate : null,
        createdAt: now,
        updatedAt: now,
      };

      await saveCaseAndAccessRecords(deps, caseDetail);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId: caseDetail.caseId,
          companyId: caseDetail.companyId,
          actorId: creatorId,
          action: CaseHistoryAction.CASE_CREATED,
          detail: "Case created",
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Success", caseId: caseDetail.caseId }),
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
  assignmentRepo: new CaseAssignmentRepository(tableName),
  visibilityRepo: new CaseVisibilityRepository(tableName),
  userRepo: new UserRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  teamRepo: new TeamRepository(tableName),
});

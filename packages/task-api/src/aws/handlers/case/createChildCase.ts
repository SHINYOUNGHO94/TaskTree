import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseHistoryAction,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
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
  unauthorized,
} from "@/errors/utils";

const ROLE_RANK: Record<string, number> = {
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

const ALL_DELIVERY_TYPES = new Set<string>(Object.values(CaseDeliveryType));
const ALL_TARGET_SCOPES = new Set<string>(Object.values(CaseTargetScope));
const ALL_USER_ROLES = new Set<string>(Object.values(UserRole));

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const canManageCaseOwner = (
  profile: {
    role: UserRole;
    divisionId?: string;
    departmentId?: string;
    teamId?: string;
  },
  parentCase: CaseDetail,
): boolean => {
  if (parentCase.ownerType === CaseOwnerType.COMPANY) {
    return profile.role === UserRole.COMPANY_ADMIN;
  }
  if (parentCase.ownerType === CaseOwnerType.DIVISION) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN &&
        parentCase.divisionId === profile.divisionId)
    );
  }
  if (parentCase.ownerType === CaseOwnerType.DEPARTMENT) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN &&
        parentCase.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN &&
        parentCase.departmentId === profile.departmentId)
    );
  }
  if (parentCase.ownerType === CaseOwnerType.TEAM) {
    return (
      profile.role === UserRole.COMPANY_ADMIN ||
      (profile.role === UserRole.DIVISION_ADMIN &&
        parentCase.divisionId === profile.divisionId) ||
      (profile.role === UserRole.DEPT_ADMIN &&
        parentCase.departmentId === profile.departmentId) ||
      (profile.role === UserRole.TEAM_ADMIN &&
        parentCase.teamId === profile.teamId)
    );
  }
  // ownerType=USER: org admin 권한 없음. creator / USER owner 경로만 허용.
  return false;
};

export interface CreateChildCaseDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  assignmentRepo: CaseAssignmentRepository;
  visibilityRepo: CaseVisibilityRepository;
  userRepo: UserRepository;
  divisionRepo: DivisionRepository;
  deptRepo: DepartmentRepository;
  teamRepo: TeamRepository;
}

const saveCaseAndAccessRecords = async (
  deps: Pick<CreateChildCaseDeps, "caseRepo" | "assignmentRepo" | "visibilityRepo">,
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
  (deps: CreateChildCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const parentCaseId = event.pathParameters?.id;
      if (!parentCaseId) return notFound("Case not found");

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set([
        "title",
        "description",
        "deliveryType",
        "targetScope",
        "targetScopeId",
        "requiredRole",
        "dueDate",
      ]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Unexpected field in request body");
      }

      const { title, description, deliveryType, targetScope, targetScopeId, requiredRole } = body;

      if (!isNonEmptyString(title)) {
        return badRequest("title is required");
      }
      if (!isNonEmptyString(description)) {
        return badRequest("description is required");
      }
      if (!isNonEmptyString(deliveryType) || !ALL_DELIVERY_TYPES.has(deliveryType)) {
        return badRequest("deliveryType is invalid");
      }
      if (!isNonEmptyString(targetScope) || !ALL_TARGET_SCOPES.has(targetScope)) {
        return badRequest("targetScope is invalid");
      }
      if (!isNonEmptyString(targetScopeId)) {
        return badRequest("targetScopeId is required");
      }
      if (!isNonEmptyString(requiredRole) || !ALL_USER_ROLES.has(requiredRole)) {
        return badRequest("requiredRole is invalid");
      }

      if (body.dueDate !== null && body.dueDate !== undefined && typeof body.dueDate !== "string") {
        return badRequest("dueDate must be a string or null");
      }
      const dueDate = typeof body.dueDate === "string" && body.dueDate.trim() ? body.dueDate : null;

      const [profile, parentCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(parentCaseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!parentCase) return notFound("Case not found");

      if (parentCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (parentCase.caseType === CaseType.REQUEST) {
        return badRequest("Cannot create child cases under a REQUEST case");
      }

      if (parentCase.caseType !== CaseType.STANDARD && parentCase.caseType !== CaseType.PROJECT) {
        return badRequest("Child cases can only be created under a STANDARD or PROJECT case");
      }

      const isCreator = parentCase.creatorId === userId;
      const isUserOwner =
        parentCase.ownerType === CaseOwnerType.USER && parentCase.ownerId === userId;
      const isOrgAdmin = canManageCaseOwner(profile, parentCase);

      if (!isCreator && !isUserOwner && !isOrgAdmin) {
        return forbidden("You do not have permission to create child cases");
      }

      const allowedScopes = ALLOWED_TARGET_SCOPES_BY_ROLE[profile.role] ?? [];
      if (!allowedScopes.includes(targetScope as CaseTargetScope)) {
        return forbidden("Your role does not allow this target scope");
      }

      const callerRoleRank = ROLE_RANK[profile.role] ?? 0;
      const requiredRoleRank = ROLE_RANK[requiredRole] ?? -1;
      if (requiredRoleRank > callerRoleRank) {
        return badRequest("requiredRole must not exceed your own role");
      }

      if (targetScope === CaseTargetScope.USER && deliveryType !== CaseDeliveryType.DIRECT) {
        return badRequest("deliveryType must be DIRECT when targetScope is USER");
      }

      const typedScope = targetScope as CaseTargetScope;

      if (typedScope === CaseTargetScope.COMPANY) {
        if (targetScopeId !== profile.companyId) {
          return forbidden("targetScopeId must match your companyId for COMPANY scope");
        }
      } else if (typedScope === CaseTargetScope.DIVISION) {
        const division = await deps.divisionRepo.findById(profile.companyId, targetScopeId);
        if (!division) return notFound("Division not found");
        if (
          profile.role === UserRole.DIVISION_ADMIN &&
          division.divisionId !== profile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target their own division");
        }
      } else if (typedScope === CaseTargetScope.DEPARTMENT) {
        const departments = await deps.deptRepo.findByCompanyId(profile.companyId);
        const dept = departments.find((d) => d.departmentId === targetScopeId);
        if (!dept) return notFound("Department not found");
        if (
          profile.role === UserRole.DIVISION_ADMIN &&
          dept.divisionId !== profile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target departments within their division");
        }
        if (
          profile.role === UserRole.DEPT_ADMIN &&
          dept.departmentId !== profile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target their own department");
        }
      } else if (typedScope === CaseTargetScope.TEAM) {
        const teams = await deps.teamRepo.findByCompanyId(profile.companyId);
        const team = teams.find((t) => t.teamId === targetScopeId);
        if (!team) return notFound("Team not found");
        if (
          profile.role === UserRole.DIVISION_ADMIN &&
          team.divisionId !== profile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target teams within their division");
        }
        if (
          profile.role === UserRole.DEPT_ADMIN &&
          team.departmentId !== profile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target teams within their department");
        }
        if (
          profile.role === UserRole.TEAM_ADMIN &&
          team.teamId !== profile.teamId
        ) {
          return forbidden("TEAM_ADMIN can only target their own team");
        }
      } else if (typedScope === CaseTargetScope.USER) {
        const targetUser = await deps.userRepo.findByUserId(targetScopeId);
        if (!targetUser) return notFound("Target user not found");
        if (targetUser.companyId !== profile.companyId) {
          return forbidden("Target user belongs to a different company");
        }
        if (
          profile.role === UserRole.DIVISION_ADMIN &&
          targetUser.divisionId !== profile.divisionId
        ) {
          return forbidden("DIVISION_ADMIN can only target users within their division");
        }
        if (
          profile.role === UserRole.DEPT_ADMIN &&
          targetUser.departmentId !== profile.departmentId
        ) {
          return forbidden("DEPT_ADMIN can only target users within their department");
        }
        if (
          profile.role === UserRole.TEAM_ADMIN &&
          targetUser.teamId !== profile.teamId
        ) {
          return forbidden("TEAM_ADMIN can only target users within their team");
        }
        if (
          (profile.role === UserRole.USER || profile.role === UserRole.GUEST) &&
          targetScopeId !== userId
        ) {
          return forbidden("Users can only target themselves");
        }
      }

      const childCaseType =
        parentCase.caseType === CaseType.PROJECT ? CaseType.STANDARD : CaseType.REQUEST;
      const childProjectId =
        parentCase.caseType === CaseType.PROJECT ? parentCaseId : parentCase.projectId;

      const now = new Date().toISOString();
      const childCase: CaseDetail = {
        caseId: randomUUID(),
        title: title.trim(),
        description: description.trim(),
        caseType: childCaseType,
        status: CaseStatus.WAITING,
        deliveryType: deliveryType as CaseDeliveryType,
        ownerType: CaseOwnerType.USER,
        ownerId: userId,
        targetScope: typedScope,
        targetScopeId,
        requiredRole: requiredRole as UserRole,
        companyId: profile.companyId,
        divisionId: profile.divisionId,
        departmentId: profile.departmentId,
        teamId: profile.teamId,
        creatorId: userId,
        projectId: childProjectId,
        parentCaseId,
        dueDate,
        createdAt: now,
        updatedAt: now,
      };

      await saveCaseAndAccessRecords(deps, childCase);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId: parentCaseId,
          companyId: profile.companyId,
          actorId: userId,
          action: CaseHistoryAction.CHILD_CASE_CREATED,
          detail: `Child case created: ${childCase.title}`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId: childCase.caseId }),
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

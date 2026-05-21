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
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

const ALLOWED_REQUIRED_ROLES: string[] = [UserRole.USER, UserRole.TEAM_ADMIN];
const ALLOWED_DELIVERY_TYPES: string[] = [CaseDeliveryType.DIRECT, CaseDeliveryType.OPEN];
const ALLOWED_TARGET_SCOPES: string[] = [CaseTargetScope.USER, CaseTargetScope.TEAM];

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export interface CreateChildCaseDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
}

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
      if (!isNonEmptyString(deliveryType) || !ALLOWED_DELIVERY_TYPES.includes(deliveryType)) {
        return badRequest("deliveryType must be DIRECT or OPEN");
      }
      if (!isNonEmptyString(targetScope) || !ALLOWED_TARGET_SCOPES.includes(targetScope)) {
        return badRequest("targetScope must be USER or TEAM");
      }
      if (!isNonEmptyString(targetScopeId)) {
        return badRequest("targetScopeId is required");
      }
      if (!isNonEmptyString(requiredRole) || !ALLOWED_REQUIRED_ROLES.includes(requiredRole)) {
        return badRequest("requiredRole must be USER or TEAM_ADMIN");
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

      if (parentCase.caseType !== CaseType.STANDARD) {
        return badRequest("Child cases can only be created under a STANDARD case");
      }

      const isCreator = parentCase.creatorId === userId;
      const isUserOwner =
        parentCase.ownerType === CaseOwnerType.USER && parentCase.ownerId === userId;

      if (!isCreator && !isUserOwner) {
        return forbidden("Only the case creator or owner can create child cases");
      }

      if (
        targetScope === CaseTargetScope.TEAM &&
        targetScopeId !== profile.teamId
      ) {
        return forbidden("TEAM target must use your own team id");
      }

      if (targetScope === CaseTargetScope.USER) {
        const targetUser = await deps.userRepo.findByUserId(targetScopeId);
        if (!targetUser) return notFound("Target user not found");
        if (targetUser.companyId !== profile.companyId) {
          return forbidden("Target user belongs to a different company");
        }
        if (targetUser.teamId !== profile.teamId) {
          return forbidden("USER target must be within your own team");
        }
      }

      const now = new Date().toISOString();
      const childCase: CaseDetail = {
        caseId: randomUUID(),
        title: title.trim(),
        description: description.trim(),
        caseType: CaseType.REQUEST,
        status: CaseStatus.WAITING,
        deliveryType: deliveryType as CaseDeliveryType,
        ownerType: CaseOwnerType.USER,
        ownerId: userId,
        targetScope: targetScope as CaseTargetScope,
        targetScopeId,
        requiredRole: requiredRole as UserRole,
        companyId: profile.companyId,
        divisionId: profile.divisionId,
        departmentId: profile.departmentId,
        teamId: profile.teamId,
        creatorId: userId,
        projectId: parentCase.projectId,
        parentCaseId,
        dueDate,
        createdAt: now,
        updatedAt: now,
      };

      await deps.caseRepo.save(childCase);

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
  userRepo: new UserRepository(tableName),
});

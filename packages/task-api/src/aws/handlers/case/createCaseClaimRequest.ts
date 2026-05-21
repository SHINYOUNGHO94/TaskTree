import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseClaimRequest,
  CaseClaimRequestStatus,
  CaseDeliveryType,
  CaseDetail,
  CaseHistoryAction,
  CaseOwnerType,
  CaseTargetScope,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseClaimRequestRepository } from "@/repositories/caseClaimRequestRepository";
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

const isAccessAllowed = (caseDetail: CaseDetail, userId: string, teamId: string): boolean => {
  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;
  if (caseDetail.targetScope === CaseTargetScope.USER && caseDetail.targetScopeId === userId)
    return true;
  if (caseDetail.targetScope === CaseTargetScope.TEAM && caseDetail.targetScopeId === teamId)
    return true;
  return false;
};

export interface CreateCaseClaimRequestDeps {
  caseRepo: CaseRepository;
  claimRequestRepo: CaseClaimRequestRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: CreateCaseClaimRequestDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

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

      const allowedFields = new Set(["message"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Unexpected field in request body");
      }

      const { message } = body;
      if (message !== undefined && (typeof message !== "string" || !message.trim())) {
        return badRequest("message must be a non-empty string if provided");
      }

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (existingCase.deliveryType !== CaseDeliveryType.OPEN) {
        return forbidden("Claim requests are only allowed for OPEN cases");
      }

      if (!isAccessAllowed(existingCase, userId, profile.teamId)) {
        return forbidden("You do not have access to this case");
      }

      if (existingCase.creatorId === userId) {
        return forbidden("Case creator cannot submit a claim request");
      }

      if (existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId) {
        return forbidden("Current case owner cannot submit a claim request");
      }

      const existingClaims = await deps.claimRequestRepo.findByCaseId(caseId);
      const hasPending = existingClaims.some(
        (r) => r.requesterId === userId && r.status === CaseClaimRequestStatus.PENDING,
      );
      if (hasPending) {
        return badRequest("You already have a pending claim request for this case");
      }

      const now = new Date().toISOString();
      const claimRequest: CaseClaimRequest = {
        claimRequestId: randomUUID(),
        caseId,
        companyId: profile.companyId,
        requesterId: userId,
        status: CaseClaimRequestStatus.PENDING,
        message: typeof message === "string" ? message.trim() : null,
        rejectReason: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await deps.claimRequestRepo.save(claimRequest);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: profile.companyId,
          actorId: userId,
          action: CaseHistoryAction.CLAIM_REQUESTED,
          detail: `Claim requested by ${userId}`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ claimRequestId: claimRequest.claimRequestId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  claimRequestRepo: new CaseClaimRequestRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  userRepo: new UserRepository(tableName),
});

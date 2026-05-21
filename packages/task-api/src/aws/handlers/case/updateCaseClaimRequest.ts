import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseClaimRequestStatus,
  CaseHistoryAction,
  CaseOwnerType,
  CaseStatus,
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

export interface UpdateCaseClaimRequestDeps {
  caseRepo: CaseRepository;
  claimRequestRepo: CaseClaimRequestRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: UpdateCaseClaimRequestDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      const claimRequestId = event.pathParameters?.claimRequestId;
      if (!caseId || !claimRequestId) return notFound("Case or claim request not found");

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

      const allowedFields = new Set(["status", "rejectReason"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Unexpected field in request body");
      }

      const { status, rejectReason } = body;

      if (
        status !== CaseClaimRequestStatus.APPROVED &&
        status !== CaseClaimRequestStatus.REJECTED
      ) {
        return badRequest("status must be APPROVED or REJECTED");
      }

      if (status === CaseClaimRequestStatus.REJECTED) {
        if (typeof rejectReason !== "string" || !rejectReason.trim()) {
          return badRequest("rejectReason is required when status is REJECTED");
        }
      }

      if (status === CaseClaimRequestStatus.APPROVED && rejectReason !== undefined) {
        return badRequest("rejectReason is not allowed when status is APPROVED");
      }

      const [profile, existingCase, claimRequest] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
        deps.claimRequestRepo.findById(caseId, claimRequestId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");
      if (!claimRequest) return notFound("Claim request not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;

      if (!isCreator && !isUserOwner) {
        return forbidden("Only the case creator or owner can approve or reject claim requests");
      }

      if (claimRequest.status !== CaseClaimRequestStatus.PENDING) {
        return badRequest("Only pending claim requests can be updated");
      }

      const now = new Date().toISOString();

      if (status === CaseClaimRequestStatus.APPROVED) {
        const updatedClaimRequest = {
          ...claimRequest,
          status: CaseClaimRequestStatus.APPROVED,
          reviewedBy: userId,
          reviewedAt: now,
          updatedAt: now,
        };
        const updatedCase = {
          ...existingCase,
          ownerType: CaseOwnerType.USER,
          ownerId: claimRequest.requesterId,
          status:
            existingCase.status === CaseStatus.WAITING
              ? CaseStatus.IN_PROGRESS
              : existingCase.status,
          updatedAt: now,
        };

        const allClaims = await deps.claimRequestRepo.findByCaseId(caseId);
        const otherPending = allClaims.filter(
          (r) =>
            r.status === CaseClaimRequestStatus.PENDING &&
            r.claimRequestId !== claimRequestId,
        );
        const rejectedClaimRequests = otherPending.map((r) => ({
          ...r,
          status: CaseClaimRequestStatus.REJECTED,
          rejectReason: "Another claim request was approved",
          reviewedBy: userId,
          reviewedAt: now,
          updatedAt: now,
        }));

        await deps.claimRequestRepo.approveWithCaseUpdate({
          approvedClaimRequest: updatedClaimRequest,
          updatedCase,
          rejectedClaimRequests,
        });

        try {
          await deps.caseHistoryRepo.save({
            historyId: randomUUID(),
            caseId,
            companyId: profile.companyId,
            actorId: userId,
            action: CaseHistoryAction.CLAIM_APPROVED,
            detail: `Claim approved for ${claimRequest.requesterId}`,
            createdAt: now,
          });
        } catch (historyError) {
          console.error("Failed to write case history", historyError);
        }
      } else {
        const updatedClaimRequest = {
          ...claimRequest,
          status: CaseClaimRequestStatus.REJECTED,
          rejectReason: (rejectReason as string).trim(),
          reviewedBy: userId,
          reviewedAt: now,
          updatedAt: now,
        };
        await deps.claimRequestRepo.save(updatedClaimRequest);

        try {
          await deps.caseHistoryRepo.save({
            historyId: randomUUID(),
            caseId,
            companyId: profile.companyId,
            actorId: userId,
            action: CaseHistoryAction.CLAIM_REJECTED,
            detail: `Claim rejected for ${claimRequest.requesterId}`,
            createdAt: now,
          });
        } catch (historyError) {
          console.error("Failed to write case history", historyError);
        }
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ claimRequestId }),
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

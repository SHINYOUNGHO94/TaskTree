import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseHistoryAction,
  CaseParticipantCompanyStatus,
  CaseParticipantType,
  CaseStatus,
  CaseType,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface ClientReviewCaseDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  caseHistoryRepo: CaseHistoryRepository;
  assignmentRepo: CaseAssignmentRepository;
  visibilityRepo: CaseVisibilityRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: ClientReviewCaseDeps) =>
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

      const { action, reason } = body;
      if (action !== "APPROVE" && action !== "REJECT") {
        return badRequest("action must be APPROVE or REJECT");
      }
      if (action === "REJECT" && (typeof reason !== "string" || !reason.trim())) {
        return badRequest("reason is required when action is REJECT");
      }

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");

      if (caseDetail.caseType !== CaseType.PROJECT) {
        return badRequest("Client review is only available for PROJECT cases");
      }

      if (caseDetail.status !== CaseStatus.REVIEW_REQUESTED) {
        return badRequest("Case must be in REVIEW_REQUESTED status");
      }

      if (caseDetail.companyId === profile.companyId) {
        return forbidden("Owner company cannot perform client review");
      }

      const participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
        caseId,
        profile.companyId,
      );

      if (!participantRecord) {
        return forbidden("You are not a participant of this case");
      }
      if (participantRecord.participantType !== CaseParticipantType.CLIENT) {
        return forbidden("Only CLIENT participants can perform client review");
      }
      if (participantRecord.status !== CaseParticipantCompanyStatus.ACTIVE) {
        return forbidden("Your participant status is not ACTIVE");
      }

      const now = new Date().toISOString();
      const newStatus = action === "APPROVE" ? CaseStatus.COMPLETED : CaseStatus.REOPENED;
      const updatedCase = { ...caseDetail, status: newStatus, updatedAt: now };

      await deps.caseRepo.saveWithAccessRecords(updatedCase);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: profile.companyId,
          actorId: userId,
          action:
            action === "APPROVE"
              ? CaseHistoryAction.CLIENT_REVIEW_APPROVED
              : CaseHistoryAction.CLIENT_REVIEW_REJECTED,
          detail:
            action === "APPROVE"
              ? `Client review approved by company ${profile.companyId}`
              : `Client review rejected: ${(reason as string).trim()}`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  assignmentRepo: new CaseAssignmentRepository(tableName),
  visibilityRepo: new CaseVisibilityRepository(tableName),
  userRepo: new UserRepository(tableName),
});

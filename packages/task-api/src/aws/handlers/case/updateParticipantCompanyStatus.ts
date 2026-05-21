import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseHistoryAction,
  CaseParticipantCompanyStatus,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
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

const ADMIN_ROLES = new Set<UserRole>([
  UserRole.COMPANY_ADMIN,
  UserRole.DIVISION_ADMIN,
]);

export interface UpdateParticipantCompanyStatusDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: UpdateParticipantCompanyStatusDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      const participantCompanyId = event.pathParameters?.participantCompanyId;
      if (!caseId || !participantCompanyId) return notFound("Case or participant company not found");

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) return invalidRequestBody();

      const allowedFields = new Set(["status"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Unexpected field in request body");
      }

      const { status } = body;
      if (
        status !== CaseParticipantCompanyStatus.ACTIVE &&
        status !== CaseParticipantCompanyStatus.REJECTED
      ) {
        return badRequest("status must be ACTIVE or REJECTED");
      }

      const [profile, caseDetail, participantRecord] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
        deps.participantCompanyRepo.findByCaseAndCompany(caseId, participantCompanyId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");
      if (!participantRecord) return notFound("Participant company record not found");

      if (profile.companyId !== participantRecord.companyId) {
        return forbidden("Only the invited company can accept or reject the invitation");
      }

      if (profile.companyId === caseDetail.companyId) {
        return forbidden("The owner company cannot accept or reject its own invitation");
      }

      if (!ADMIN_ROLES.has(profile.role)) {
        return forbidden("Only COMPANY_ADMIN or DIVISION_ADMIN can accept or reject invitations");
      }

      if (participantRecord.status !== CaseParticipantCompanyStatus.INVITED) {
        return badRequest("Only INVITED participant company records can be updated");
      }

      const now = new Date().toISOString();
      const updatedRecord = {
        ...participantRecord,
        status: status as CaseParticipantCompanyStatus,
        reviewedBy: userId,
        reviewedAt: now,
        updatedAt: now,
      };

      await deps.participantCompanyRepo.save(updatedRecord);

      const historyAction =
        status === CaseParticipantCompanyStatus.ACTIVE
          ? CaseHistoryAction.PARTICIPANT_COMPANY_ACCEPTED
          : CaseHistoryAction.PARTICIPANT_COMPANY_REJECTED;

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: caseDetail.companyId,
          actorId: userId,
          action: historyAction,
          detail: `Company ${participantCompanyId} ${status === CaseParticipantCompanyStatus.ACTIVE ? "accepted" : "rejected"} participation`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ participantCompanyId }),
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
  userRepo: new UserRepository(tableName),
});

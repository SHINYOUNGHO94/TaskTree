import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseParticipantCompanyStatus, CaseParticipantType, CaseHistoryAction } from "@task/core";
import { CompanyEmailInvitationRepository } from "@/repositories/companyEmailInvitationRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface AcceptEmailInvitationDeps {
  invitationRepo: CompanyEmailInvitationRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  caseHistoryRepo: CaseHistoryRepository;
  caseRepo: CaseRepository;
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
}

export const createHandler =
  (deps: AcceptEmailInvitationDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const invitationId = event.pathParameters?.invitationId;
      if (!invitationId) return badRequest("invitationId is required");

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      // Find invitation by scanning email-prefixed records
      const invitations = await deps.invitationRepo.findByEmail(profile.email);
      const invitation = invitations.find((inv) => inv.invitationId === invitationId);

      if (!invitation) return notFound("Invitation not found");
      if (invitation.email !== profile.email) return forbidden("This invitation is not for your account");
      if (invitation.status !== "PENDING") return badRequest("Invitation is no longer pending");

      const caseDetail = await deps.caseRepo.findById(invitation.caseId);
      if (!caseDetail) return notFound("Case not found");

      const existing = await deps.participantCompanyRepo.findByCaseAndCompany(
        invitation.caseId,
        profile.companyId,
      );
      if (existing && (existing.status === CaseParticipantCompanyStatus.INVITED || existing.status === CaseParticipantCompanyStatus.ACTIVE)) {
        return badRequest("Your company is already participating in this case");
      }

      const myCompany = await deps.companyRepo.findById(profile.companyId);
      const now = new Date().toISOString();

      await deps.participantCompanyRepo.save({
        participantCompanyId: profile.companyId,
        caseId: invitation.caseId,
        ownerCompanyId: invitation.ownerCompanyId,
        companyId: profile.companyId,
        companyName: myCompany?.name ?? null,
        status: CaseParticipantCompanyStatus.ACTIVE,
        participantType: CaseParticipantType.COLLABORATOR,
        invitedBy: "email-invitation",
        reviewedBy: userId,
        reviewedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      await deps.invitationRepo.updateStatus(profile.email, invitation.caseId, "ACCEPTED");

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId: invitation.caseId,
          companyId: invitation.ownerCompanyId,
          actorId: userId,
          action: CaseHistoryAction.PARTICIPANT_COMPANY_ACCEPTED,
          detail: `Company ${profile.companyId} joined via email invitation`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId: invitation.caseId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  invitationRepo: new CompanyEmailInvitationRepository(tableName),
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  caseRepo: new CaseRepository(tableName),
  userRepo: new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
});

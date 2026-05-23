import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseParticipantCompanyStatus, ParticipantCompanyInvitation } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

export interface GetParticipantCompanyInvitationsDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetParticipantCompanyInvitationsDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const participants = await deps.participantCompanyRepo.findByParticipantCompanyId(
        profile.companyId,
        [CaseParticipantCompanyStatus.INVITED, CaseParticipantCompanyStatus.ACTIVE],
      );

      const invitations: ParticipantCompanyInvitation[] = [];
      const caseIds = [...new Set(participants.map((p) => p.caseId))];

      const caseDetails = await Promise.all(caseIds.map((id) => deps.caseRepo.findById(id)));

      const caseMap = new Map(
        caseDetails
          .filter((c): c is NonNullable<typeof c> => c !== undefined)
          .map((c) => [c.caseId, c]),
      );

      for (const participant of participants) {
        const caseDetail = caseMap.get(participant.caseId);
        if (!caseDetail) continue;

        invitations.push({
          participantCompany: participant,
          caseSummary: {
            caseId: caseDetail.caseId,
            title: caseDetail.title,
            caseType: caseDetail.caseType,
            status: caseDetail.status,
            deliveryType: caseDetail.deliveryType,
            ownerCompanyId: caseDetail.companyId,
            createdAt: caseDetail.createdAt,
          },
        });
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(invitations),
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
  userRepo: new UserRepository(tableName),
});

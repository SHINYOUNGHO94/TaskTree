import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ParticipantCompanyInvitation } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

export interface GetSentParticipantCompanyInvitationsDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetSentParticipantCompanyInvitationsDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const companyId = profile.companyId;

      // Without a sent-invitation GSI, this endpoint is scoped to cases owned by the current user.
      const caseIds = await deps.caseRepo.findCaseIdsByUser(userId, companyId);
      if (caseIds.length === 0) {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify([]),
        };
      }

      // Fan-out: get participant companies for each case
      const participantLists = await Promise.all(
        caseIds.map((caseId) => deps.participantCompanyRepo.findByCaseId(caseId)),
      );

      const casesWithParticipants = caseIds
        .map((caseId, i) => ({ caseId, participants: participantLists[i] }))
        .filter(({ participants }) => participants.length > 0);

      if (casesWithParticipants.length === 0) {
        return {
          statusCode: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify([]),
        };
      }

      const uniqueCaseIds = [...new Set(casesWithParticipants.map((c) => c.caseId))];
      const caseDetails = await Promise.all(uniqueCaseIds.map((id) => deps.caseRepo.findById(id)));
      const caseMap = new Map(
        caseDetails
          .filter((c): c is NonNullable<typeof c> => c !== undefined)
          .map((c) => [c.caseId, c]),
      );

      const invitations: ParticipantCompanyInvitation[] = [];

      for (const { participants } of casesWithParticipants) {
        for (const participant of participants) {
          // Tenant isolation: only include records owned by this company
          if (participant.ownerCompanyId !== companyId) continue;

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
              dueDate: caseDetail.dueDate,
            },
          });
        }
      }

      // Sort newest first
      invitations.sort(
        (a, b) =>
          new Date(b.participantCompany.updatedAt).getTime() -
          new Date(a.participantCompany.updatedAt).getTime(),
      );

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

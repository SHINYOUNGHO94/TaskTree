import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsAnyParticipant } from "@/services/casePermissionService";
import { forbidden, internalServerError, notFound, unauthorized } from "@/errors/utils";

export interface GetParticipantCompaniesDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetParticipantCompaniesDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");

      const isSameCompany = caseDetail.companyId === profile.companyId;

      if (isSameCompany) {
        if (!canReadCase(caseDetail, userId, profile)) {
          return forbidden("You do not have access to this case");
        }
      } else {
        let participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
          caseId,
          profile.companyId,
        );
        if (!participantRecord && caseDetail.projectId) {
          participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
            caseDetail.projectId,
            profile.companyId,
          );
        }
        if (!canReadCaseAsAnyParticipant(caseDetail, participantRecord, profile.companyId)) {
          return forbidden("You do not have access to this case");
        }
      }

      const participants = await deps.participantCompanyRepo.findByCaseId(caseId);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(participants),
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

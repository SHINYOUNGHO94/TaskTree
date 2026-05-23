import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsParticipant } from "@/services/casePermissionService";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface GetCaseTasksDeps {
  caseRepo: CaseRepository;
  caseTaskRepo: CaseTaskRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCaseTasksDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      const isSameCompany = existingCase.companyId === profile.companyId;

      if (isSameCompany) {
        if (!canReadCase(existingCase, userId, profile)) {
          return forbidden("You do not have access to this case");
        }
      } else {
        const participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
          caseId,
          profile.companyId,
        );
        if (!canReadCaseAsParticipant(existingCase, participantRecord, profile.companyId)) {
          return forbidden("You do not have access to this case");
        }
      }

      const tasks = await deps.caseTaskRepo.findByCaseId(caseId);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(tasks),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseTaskRepo: new CaseTaskRepository(tableName),
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  userRepo: new UserRepository(tableName),
});

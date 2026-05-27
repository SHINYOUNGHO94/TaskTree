import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseFileRepository } from "@/repositories/caseFileRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsAnyParticipant } from "@/services/casePermissionService";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface GetCaseFilesDeps {
  caseRepo: CaseRepository;
  caseFileRepo: CaseFileRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCaseFilesDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext?.authorizer?.claims?.sub;
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
          return forbidden("Access denied");
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
          return forbidden("Access denied");
        }
      }

      const files = await deps.caseFileRepo.findByCaseId(caseId);

      // objectKey は絶対に含めない
      const body = files.map(({ objectKey: _objectKey, ...rest }) => rest);

      return {
        statusCode: 200,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(body),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  caseFileRepo: new CaseFileRepository(process.env.TABLE_NAME!),
  participantCompanyRepo: new CaseParticipantCompanyRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
});

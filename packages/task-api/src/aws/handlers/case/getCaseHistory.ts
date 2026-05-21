import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseOwnerType, CaseTargetScope } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const isAccessAllowed = (
  caseDetail: CaseDetail,
  userId: string,
  teamId: string,
): boolean => {
  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;
  if (caseDetail.targetScope === CaseTargetScope.USER && caseDetail.targetScopeId === userId) return true;
  if (caseDetail.targetScope === CaseTargetScope.TEAM && caseDetail.targetScopeId === teamId) return true;
  return false;
};

export interface GetCaseHistoryDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCaseHistoryDeps) =>
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

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (!isAccessAllowed(existingCase, userId, profile.teamId)) {
        return forbidden("You do not have access to this case");
      }

      const entries = await deps.caseHistoryRepo.findByCaseId(caseId);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(entries),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  userRepo: new UserRepository(tableName),
});

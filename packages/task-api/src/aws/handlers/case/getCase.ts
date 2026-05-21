import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseOwnerType, CaseTargetScope } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
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

export interface GetCaseDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCaseDeps) =>
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

      if (caseDetail.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (!isAccessAllowed(caseDetail, userId, profile.teamId)) {
        return forbidden("You do not have access to this case");
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(caseDetail),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  userRepo: new UserRepository(tableName),
});

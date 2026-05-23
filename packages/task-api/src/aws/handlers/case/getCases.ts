import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRole } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

export interface GetCasesDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCasesDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const cases = await deps.caseRepo.findByUser({
        companyId: profile.companyId,
        divisionId: profile.divisionId,
        departmentId: profile.departmentId,
        teamId: profile.teamId,
        userId,
        userRoleRank: ROLE_RANK[profile.role] ?? 1,
      });

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(cases),
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

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TeamRepository } from "@/repositories/teamRepository";
import { UserRepository } from "@/repositories/userRepository";
import { UserRole } from "@task/core";
import {
  unauthorized,
  forbidden,
  requiredFieldsMissing,
  notFound,
  badRequest,
  internalServerError,
} from "@/errors/utils";

export interface DeleteTeamDeps {
  repository: TeamRepository;
  userRepo: UserRepository;
}

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,DELETE",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(body),
});

const ALLOWED_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN];

// COMPANY_ADMIN / DIVISION_ADMIN / DEPT_ADMIN が権限範囲内のチームを削除できる
export const createHandler =
  (deps: DeleteTeamDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const authorizer = event.requestContext.authorizer;
      if (!authorizer || !authorizer.claims) {
        return unauthorized();
      }

      const callerId = authorizer.claims.sub as string;
      const callerProfile = await deps.userRepo.findByUserId(callerId);
      if (!callerProfile) {
        return forbidden("Profile not found");
      }

      if (!ALLOWED_ROLES.includes(callerProfile.role as UserRole)) {
        return forbidden("Insufficient role to delete teams");
      }

      const teamId = event.pathParameters?.id;
      if (!teamId) {
        return requiredFieldsMissing();
      }

      const companyId = callerProfile.companyId;
      const existing = await deps.repository.findByIdInCompany(companyId, teamId);
      if (!existing) {
        return notFound("Team not found in your company");
      }

      if (callerProfile.role === UserRole.DEPT_ADMIN) {
        if (existing.departmentId !== callerProfile.departmentId) {
          return forbidden("DEPT_ADMIN can only delete teams in their own department");
        }
      } else if (callerProfile.role === UserRole.DIVISION_ADMIN) {
        if (existing.divisionId !== callerProfile.divisionId) {
          return forbidden("DIVISION_ADMIN can only delete teams in their own division");
        }
      }

      const teamUsers = await deps.userRepo.findByTeamId(teamId, companyId);
      if (teamUsers.length > 0) {
        return badRequest("Cannot delete team: it has assigned members");
      }

      await deps.repository.deleteById(existing.departmentId, teamId);

      return createResponse(200, { message: "Team deleted successfully", teamId });
    } catch (error) {
      console.error("Error deleting team:", error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new TeamRepository(tableName),
  userRepo: new UserRepository(tableName),
});

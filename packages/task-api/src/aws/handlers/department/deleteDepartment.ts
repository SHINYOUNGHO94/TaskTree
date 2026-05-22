import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "@/repositories/departmentRepository";
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

export interface DeleteDepartmentDeps {
  repository: DepartmentRepository;
  teamRepo: TeamRepository;
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

const ALLOWED_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN];

// COMPANY_ADMIN または DIVISION_ADMIN (自分の事業部配下) が部署を削除できる
export const createHandler =
  (deps: DeleteDepartmentDeps) =>
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
        return forbidden("Insufficient role to delete departments");
      }

      const departmentId = event.pathParameters?.id;
      if (!departmentId) {
        return requiredFieldsMissing();
      }

      const companyId = callerProfile.companyId;
      const existing = await deps.repository.findByIdInCompany(companyId, departmentId);
      if (!existing) {
        return notFound("Department not found in your company");
      }

      if (
        callerProfile.role === UserRole.DIVISION_ADMIN &&
        existing.divisionId !== callerProfile.divisionId
      ) {
        return forbidden("DIVISION_ADMIN can only delete departments in their own division");
      }

      const teams = await deps.teamRepo.findByDepartmentId(departmentId, companyId);
      if (teams.length > 0) {
        return badRequest("Cannot delete department: it has existing teams");
      }

      const hasUsers = await deps.userRepo.hasUsersByDepartmentId(companyId, departmentId);
      if (hasUsers) {
        return badRequest("Cannot delete department: it has assigned members");
      }

      await deps.repository.deleteById(existing.divisionId, departmentId);

      return createResponse(200, { message: "Department deleted successfully", departmentId });
    } catch (error) {
      console.error("Error deleting department:", error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DepartmentRepository(tableName),
  teamRepo: new TeamRepository(tableName),
  userRepo: new UserRepository(tableName),
});

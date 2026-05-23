import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { UserRepository } from "@/repositories/userRepository";
import { UserRole } from "@task/core";
import {
  unauthorized,
  forbidden,
  invalidRequestBody,
  requiredFieldsMissing,
  notFound,
  internalServerError,
} from "@/errors/utils";

export interface UpdateDepartmentDeps {
  repository: DepartmentRepository;
  userRepo: UserRepository;
}

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,PUT",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(body),
});

const ALLOWED_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN];

// COMPANY_ADMIN または DIVISION_ADMIN (自分の事業部配下) が部署を更新できる
export const createHandler =
  (deps: UpdateDepartmentDeps) =>
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
        return forbidden("Insufficient role to update departments");
      }

      const departmentId = event.pathParameters?.id;
      if (!departmentId) {
        return requiredFieldsMissing();
      }

      if (!event.body) {
        return invalidRequestBody();
      }

      let name: unknown;
      try {
        ({ name } = JSON.parse(event.body));
      } catch {
        return invalidRequestBody();
      }
      if (!name || typeof name !== "string" || !name.trim()) {
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
        return forbidden("DIVISION_ADMIN can only update departments in their own division");
      }

      await deps.repository.update(existing.divisionId, departmentId, name.trim());

      return createResponse(200, { message: "Department updated successfully", departmentId });
    } catch (error) {
      console.error("Error updating department:", error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DepartmentRepository(tableName),
  userRepo: new UserRepository(tableName),
});

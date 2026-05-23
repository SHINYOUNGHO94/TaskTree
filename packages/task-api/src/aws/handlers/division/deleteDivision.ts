import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
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

export interface DeleteDivisionDeps {
  repository: DivisionRepository;
  deptRepo: DepartmentRepository;
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

// COMPANY_ADMIN のみが事業部を削除できる
export const createHandler =
  (deps: DeleteDivisionDeps) =>
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

      if (callerProfile.role !== UserRole.COMPANY_ADMIN) {
        return forbidden("Only COMPANY_ADMIN can delete divisions");
      }

      const divisionId = event.pathParameters?.id;
      if (!divisionId) {
        return requiredFieldsMissing();
      }

      const companyId = callerProfile.companyId;
      const existing = await deps.repository.findById(companyId, divisionId);
      if (!existing) {
        return notFound("Division not found in your company");
      }

      const departments = await deps.deptRepo.findByDivisionId(divisionId, companyId);
      if (departments.length > 0) {
        return badRequest("Cannot delete division: it has existing departments");
      }

      const hasUsers = await deps.userRepo.hasUsersByDivisionId(companyId, divisionId);
      if (hasUsers) {
        return badRequest("Cannot delete division: it has assigned members");
      }

      await deps.repository.deleteById(companyId, divisionId);

      return createResponse(200, { message: "Division deleted successfully", divisionId });
    } catch (error) {
      console.error("Error deleting division:", error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DivisionRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  userRepo: new UserRepository(tableName),
});

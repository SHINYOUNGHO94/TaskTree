import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DivisionRepository } from "@/repositories/divisionRepository";
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

export interface UpdateDivisionDeps {
  repository: DivisionRepository;
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

// COMPANY_ADMIN のみが事業部を更新できる
export const createHandler =
  (deps: UpdateDivisionDeps) =>
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
        return forbidden("Only COMPANY_ADMIN can update divisions");
      }

      const divisionId = event.pathParameters?.id;
      if (!divisionId) {
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
      const existing = await deps.repository.findById(companyId, divisionId);
      if (!existing) {
        return notFound("Division not found in your company");
      }

      await deps.repository.update(companyId, divisionId, name.trim());

      return createResponse(200, { message: "Division updated successfully", divisionId });
    } catch (error) {
      console.error("Error updating division:", error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DivisionRepository(tableName),
  userRepo: new UserRepository(tableName),
});

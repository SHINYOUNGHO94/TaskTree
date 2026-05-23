import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { UserRepository } from "@/repositories/userRepository";
import { UserRole } from "@task/core";
import { unauthorized, forbidden, invalidRequestBody, requiredFieldsMissing, internalServerError } from "@/errors/utils";

export interface CreateDivisionDeps {
  repository: DivisionRepository;
  userRepo: UserRepository;
}

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  },
  body: JSON.stringify(body),
});

// COMPANY_ADMIN のみが事業部を作成できる
export const createHandler = (deps: CreateDivisionDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
      return forbidden("Only COMPANY_ADMIN can create divisions");
    }

    if (!event.body) {
      return invalidRequestBody();
    }

    const { divisionId, name } = JSON.parse(event.body);

    if (!divisionId || !name) {
      return requiredFieldsMissing();
    }

    const companyId = callerProfile.companyId;
    await deps.repository.create({ companyId, divisionId, name });

    return createResponse(201, { message: "Division created successfully", divisionId });
  } catch (error) {
    console.error("Error creating division:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DivisionRepository(tableName),
  userRepo: new UserRepository(tableName),
});

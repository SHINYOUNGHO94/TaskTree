import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import { UserRole } from "@task/core";
import { internalServerError } from "@/errors/utils";

export interface UpdateCompanyDeps {
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
}

const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export const createHandler = (deps: UpdateCompanyDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) return internalServerError("User ID not found in token");

    const caller = await deps.userRepo.findByUserId(userId);
    if (!caller) return { statusCode: 403, headers, body: JSON.stringify({ message: "User not found." }) };
    if (caller.role !== UserRole.COMPANY_ADMIN) {
      return { statusCode: 403, headers, body: JSON.stringify({ message: "Only COMPANY_ADMIN can update company name." }) };
    }

    const body = JSON.parse(event.body || "{}");
    const name: string | undefined = body.name;
    if (!name || !name.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "name is required." }) };
    }

    await deps.companyRepo.updateName(caller.companyId, name.trim());
    return { statusCode: 200, headers, body: JSON.stringify({ message: "Company updated." }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    return internalServerError(message);
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
});

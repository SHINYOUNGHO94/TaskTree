import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CompanyRepository } from "@/repositories/companyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

export interface SearchCompaniesDeps {
  companyRepo: CompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: SearchCompaniesDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const query = (event.queryStringParameters?.name ?? "").trim().toLowerCase();

      const all = await deps.companyRepo.findAll();

      const results = all
        .filter((c) => c.Company !== profile.companyId)
        .filter((c) => !query || c.name.toLowerCase().includes(query))
        .map((c) => ({ companyId: c.Company, name: c.name }));

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(results),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  companyRepo: new CompanyRepository(tableName),
  userRepo: new UserRepository(tableName),
});

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CompanyRepository } from "@/repositories/companyRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

export interface CreateCompanyDeps {
  repository: CompanyRepository;
}

export const createHandler = (deps: CreateCompanyDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, name } = JSON.parse(event.body);

    if (!companyId || !name) {
      return requiredFieldsMissing();
    }

    await deps.repository.create(companyId, name);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Company created successfully", companyId }),
    };
  } catch (error) {
    console.error("Error creating company:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new CompanyRepository(tableName)
});

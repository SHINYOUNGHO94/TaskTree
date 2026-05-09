import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CompanyRepository } from "@/repositories/companyRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new CompanyRepository(tableName);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, name } = JSON.parse(event.body);

    if (!companyId || !name) {
      return requiredFieldsMissing();
    }

    await repository.create(companyId, name);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "Company created successfully", companyId }),
    };
  } catch (error) {
    console.error("Error creating company:", error);
    return internalServerError();
  }
};

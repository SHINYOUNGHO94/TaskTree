import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

// 事業部を作成するハンドラー
export interface CreateDivisionDeps {
  repository: DivisionRepository;
}

export const createHandler = (deps: CreateDivisionDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, divisionId, name } = JSON.parse(event.body);

    if (!companyId || !divisionId || !name) {
      return requiredFieldsMissing();
    }

    await deps.repository.create({ companyId, divisionId, name });

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: JSON.stringify({ message: "Division created successfully", divisionId }),
    };
  } catch (error) {
    console.error("Error creating division:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DivisionRepository(tableName)
});

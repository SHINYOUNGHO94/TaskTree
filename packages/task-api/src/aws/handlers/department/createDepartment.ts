import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

// 部署を作成するハンドラー
export interface CreateDepartmentDeps {
  repository: DepartmentRepository;
}

export const createHandler = (deps: CreateDepartmentDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, divisionId, departmentId, name } = JSON.parse(event.body);

    if (!companyId || !divisionId || !departmentId || !name) {
      return requiredFieldsMissing();
    }

    await deps.repository.create({ companyId, divisionId, departmentId, name });

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Department created successfully", departmentId }),
    };
  } catch (error) {
    console.error("Error creating department:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DepartmentRepository(tableName)
});

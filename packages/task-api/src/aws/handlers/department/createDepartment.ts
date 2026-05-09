import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new DepartmentRepository(tableName);

// 部署を作成するハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, divisionId, departmentId, name } = JSON.parse(event.body);

    if (!companyId || !divisionId || !departmentId || !name) {
      return requiredFieldsMissing();
    }

    await repository.create({ companyId, divisionId, departmentId, name });

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

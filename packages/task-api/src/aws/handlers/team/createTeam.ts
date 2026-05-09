import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TeamRepository } from "@/repositories/teamRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

const tableName = process.env.TABLE_NAME || "";
const repository = new TeamRepository(tableName);

// チームを作成するハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const { companyId, divisionId, departmentId, teamId, name } = JSON.parse(event.body);

    if (!companyId || !divisionId || !departmentId || !teamId || !name) {
      return requiredFieldsMissing();
    }

    await repository.create({ companyId, divisionId, departmentId, teamId, name });

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Team created successfully", teamId }),
    };
  } catch (error) {
    console.error("Error creating team:", error);
    return internalServerError();
  }
};

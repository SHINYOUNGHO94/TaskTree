import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DivisionRepository } from "../../../repositories/divisionRepository";
import { UserRepository } from "../../../repositories/userRepository";

const tableName = process.env.TABLE_NAME || "";
const divRepo = new DivisionRepository(tableName);
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

// 事業部一覧取得
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const callerId = authorizer.claims.sub as string;
    const callerProfile = await userRepo.findByUserId(callerId);

    if (!callerProfile) {
      return createResponse(403, { error: "Profile not found" });
    }

    const divisions = await divRepo.findByCompanyId(callerProfile.companyId);
    
    return createResponse(200, { divisions });
  } catch (error) {
    console.error("Failed to get divisions:", error);
    return createResponse(500, { error: "Internal Server Error" });
  }
};

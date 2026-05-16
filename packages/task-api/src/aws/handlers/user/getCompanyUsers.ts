import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";

const tableName = process.env.TABLE_NAME || "";
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

// 所属会社メンバー取得
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

    const users = await userRepo.findByCompanyId(callerProfile.companyId);
    const safeUsers = users.map(u => ({
      userId: u.User,
      email: u.email,
      name: u.name,
      role: u.role,
      departmentId: u.departmentId,
      createdAt: u.at
    }));

    safeUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return createResponse(200, { users: safeUsers });
  } catch (error) {
    console.error("Failed to get company users:", error);
    return createResponse(500, { error: "Internal Server Error" });
  }
};

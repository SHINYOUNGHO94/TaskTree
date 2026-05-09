import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TeamRepository } from "../../../repositories/teamRepository";
import { UserRepository } from "../../../repositories/userRepository";

const tableName = process.env.TABLE_NAME || "";
const teamRepo = new TeamRepository(tableName);
const userRepo = new UserRepository(tableName);

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = authorizer.claims.sub as string;
    const user = await userRepo.findByUserId(userId);

    if (!user) {
      return createResponse(403, { error: "Profile not found" });
    }

    const teams = await teamRepo.findByCompanyId(user.companyId);
    teams.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return createResponse(200, { teams });
  } catch (error) {
    console.error("Failed to get teams:", error);
    return createResponse(500, { error: "Internal Server Error" });
  }
};

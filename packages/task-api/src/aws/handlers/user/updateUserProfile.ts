import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError } from "@/errors/utils";

export interface UpdateUserProfileDeps {
  userRepo: UserRepository;
}

export const createHandler = (deps: UpdateUserProfileDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) return internalServerError("User ID not found in token");

    const body = JSON.parse(event.body || "{}");
    const name: string | undefined = body.name;
    if (!name || !name.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "name is required." }) };
    }

    await deps.userRepo.updateName(userId, name.trim());
    return { statusCode: 200, headers, body: JSON.stringify({ message: "Profile updated." }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    return internalServerError(message);
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({ userRepo: new UserRepository(tableName) });

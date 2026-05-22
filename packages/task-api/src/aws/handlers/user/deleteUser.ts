import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { UserRole } from "@task/core";
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const userPoolId = process.env.USER_POOL_ID || "";
const cognitoClient = new CognitoIdentityProviderClient({});

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.COMPANY_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 2,
  [UserRole.TEAM_ADMIN]: 1,
  [UserRole.USER]: 0,
  [UserRole.GUEST]: -1,
};

const ALLOWED_CALLER_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN, UserRole.TEAM_ADMIN];

export interface DeleteUserDeps {
  userRepo: UserRepository;
}

const isCognitoUserNotFound = (error: unknown): boolean =>
  error instanceof Error && error.name === "UserNotFoundException";

export const createHandler = (deps: DeleteUserDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const callerId = authorizer.claims.sub as string;
    const callerProfile = await deps.userRepo.findByUserId(callerId);

    if (!callerProfile) {
      return createResponse(403, { error: "Profile not found" });
    }

    if (!ALLOWED_CALLER_ROLES.includes(callerProfile.role as UserRole)) {
      return createResponse(403, { error: "Insufficient permission to delete users" });
    }

    const targetUserId = event.pathParameters?.id;
    if (!targetUserId) {
      return createResponse(400, { error: "User ID is required" });
    }

    if (callerId === targetUserId) {
      return createResponse(403, { error: "Cannot delete yourself" });
    }

    const targetProfile = await deps.userRepo.findByUserId(targetUserId);
    if (!targetProfile) {
      return createResponse(404, { error: "User not found" });
    }

    if (targetProfile.companyId !== callerProfile.companyId) {
      return createResponse(403, { error: "Cannot delete user from another company" });
    }

    const callerLevel = ROLE_LEVEL[callerProfile.role as UserRole] ?? 0;
    const targetLevel = ROLE_LEVEL[targetProfile.role as UserRole] ?? 0;

    switch (callerProfile.role as UserRole) {
      case UserRole.COMPANY_ADMIN:
        // Can delete any user in the same company except themselves (already checked)
        break;
      case UserRole.DIVISION_ADMIN:
        if (targetLevel >= callerLevel) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        if (targetProfile.divisionId !== callerProfile.divisionId) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        break;
      case UserRole.DEPT_ADMIN:
        if (targetLevel >= callerLevel) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        if (targetProfile.departmentId !== callerProfile.departmentId) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        break;
      case UserRole.TEAM_ADMIN:
        if (targetProfile.role !== UserRole.USER && targetProfile.role !== UserRole.GUEST) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        if (targetProfile.teamId !== callerProfile.teamId) {
          return createResponse(403, { error: "Insufficient permission to delete this user" });
        }
        break;
    }

    try {
      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: targetProfile.email,
      }));
    } catch (error) {
      if (!isCognitoUserNotFound(error)) throw error;
    }

    await deps.userRepo.deleteByUserId(targetUserId);

    return createResponse(200, { message: "User deleted successfully" });

  } catch (error: unknown) {
    console.error("Failed to delete user:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return createResponse(500, { error: errorMessage });
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName),
});

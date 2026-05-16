import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { UserRole } from "@task/core";
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const userPoolId = process.env.USER_POOL_ID || "";
const cognitoClient = new CognitoIdentityProviderClient({});

// API Gateway 共通レスポンス
const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

// 管理者が新しいメンバーを組織に招待する

export interface InviteUserDeps {
  userRepo: UserRepository;
}

export const createHandler = (deps: InviteUserDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 権限確認
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const callerId = authorizer.claims.sub as string;
    const callerProfile = await deps.userRepo.findByUserId(callerId);

    if (!callerProfile) {
      return createResponse(403, { error: "Profile not found" });
    }

    // 組織の管理者権限を持つユーザーのみ招待可能
    const allowedRoles = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN, UserRole.TEAM_ADMIN];
    if (!allowedRoles.includes(callerProfile.role as UserRole)) {
      return createResponse(403, { error: "Forbidden: You do not have permission to invite users" });
    }

    // リクエストボディのパース
    const body = JSON.parse(event.body || "{}");
    const { email, name, role = UserRole.USER, divisionId, departmentId, teamId } = body;

    if (!email || !name) {
      return createResponse(400, { error: "Email and name are required" });
    }

    // Cognitoでユーザー作成
    const adminCreateUserCmd = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: name }
      ],
      DesiredDeliveryMediums: ["EMAIL"],
    });

    const cognitoResponse = await cognitoClient.send(adminCreateUserCmd);
    const newUserId = cognitoResponse.User?.Attributes?.find(attr => attr.Name === "sub")?.Value;

    if (!newUserId) {
      throw new Error("Failed to retrieve new user ID from Cognito");
    }

    // DynamoDBにユーザー情報を保存
    await deps.userRepo.create({
      userId: newUserId,
      email: email,
      name: name,
      role: role as UserRole,
      companyId: callerProfile.companyId,
      divisionId: divisionId || callerProfile.divisionId || "NONE",
      departmentId: departmentId || callerProfile.departmentId || "NONE",
      teamId: teamId || "NONE"
    });

    return createResponse(200, {
      message: "User invited successfully",
      userId: newUserId
    });

  } catch (error: unknown) {
    console.error("Failed to invite user:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return createResponse(500, { error: errorMessage });
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName)
});

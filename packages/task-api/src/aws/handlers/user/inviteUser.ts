import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { UserRole } from "@task/core";
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const tableName = process.env.TABLE_NAME || "";
const userPoolId = process.env.USER_POOL_ID || "";
const userRepo = new UserRepository(tableName);
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // 権限確認
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const callerId = authorizer.claims.sub as string;
    const callerProfile = await userRepo.findByUserId(callerId);

    if (!callerProfile) {
      return createResponse(403, { error: "Profile not found" });
    }

    // ADMIN のみ招待可能
    if (callerProfile.role !== UserRole.ADMIN) {
      return createResponse(403, { error: "Forbidden: Only ADMIN can invite users" });
    }

    // リクエストボディのパース
    const body = JSON.parse(event.body || "{}");
    const { email, name, role = UserRole.USER, departmentId, teamId } = body;

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
    await userRepo.create({
      userId: newUserId,
      email: email,
      name: name,
      role: role as UserRole,
      companyId: callerProfile.companyId,
      divisionId: callerProfile.divisionId || "NONE",
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

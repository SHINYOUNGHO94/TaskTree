import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { UserProfile } from "@task/core";

export interface GetCompanyUsersDeps {
  userRepo: UserRepository;
}

const fallbackDate = "1970-01-01T00:00:00.000Z";

const toRequiredString = (value: unknown, fallback: string): string => {
  return typeof value === "string" && value.length > 0 ? value : fallback;
};

const toNullableString = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

export const createHandler = (deps: GetCompanyUsersDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    const users = await deps.userRepo.findByCompanyId(callerProfile.companyId);

    const safeUsers: UserProfile[] = users.map(u => ({
      userId: u.User,
      email: u.email || "",
      name: u.name || "",
      role: u.role,
      companyId: u.companyId || "NONE",
      divisionId: u.divisionId || "NONE",
      departmentId: u.departmentId || "NONE",
      teamId: u.teamId || "NONE",
      companyName: null,
      divisionName: null,
      departmentName: null,
      teamName: null,
      createdAt: toRequiredString(u.at, fallbackDate),
      lastSignInAt: toNullableString(u.update_at),
    }));

    safeUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return createResponse(200, { users: safeUsers });
  } catch (error) {
    console.error("Failed to get company users:", error);
    return createResponse(500, { error: "Internal Server Error" });
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName)
});

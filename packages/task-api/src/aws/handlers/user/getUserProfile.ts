import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { internalServerError } from "@/errors/utils";
import { UserProfile } from "@task/core";

const fallbackDate = "1970-01-01T00:00:00.000Z";

const toRequiredString = (value: unknown, fallback: string): string => {
  return typeof value === "string" && value.length > 0 ? value : fallback;
};

const toNullableString = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

export interface GetUserProfileDeps {
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
  divisionRepo: DivisionRepository;
  deptRepo: DepartmentRepository;
  teamRepo: TeamRepository;
}

export const createHandler = (deps: GetUserProfileDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      return internalServerError("User ID not found in token");
    }

    const user = await deps.userRepo.findByUserId(userId);
    if (!user) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "User profile not found." }),
      };
    }

    const [company, division, dept, team] = await Promise.all([
      user.companyId && user.companyId !== "NONE" ? deps.companyRepo.findById(user.companyId) : null,
      user.divisionId && user.divisionId !== "NONE" ? deps.divisionRepo.findById(user.companyId, user.divisionId) : null,
      user.departmentId && user.departmentId !== "NONE" ? deps.deptRepo.findById(user.divisionId, user.departmentId) : null,
      user.teamId && user.teamId !== "NONE" ? deps.teamRepo.findById(user.departmentId, user.teamId) : null,
    ]);

    const profile: UserProfile = {
      userId: user.User,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      companyId: user.companyId || "NONE",
      divisionId: user.divisionId || "NONE",
      departmentId: user.departmentId || "NONE",
      teamId: user.teamId || "NONE",
      companyName: company?.name || null,
      divisionName: division?.name || null,
      departmentName: dept?.name || null,
      teamName: team?.name || null,
      createdAt: toRequiredString(user.at, fallbackDate),
      lastSignInAt: toNullableString(user.update_at),
    };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Error";
    return internalServerError(message);
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  teamRepo: new TeamRepository(tableName),
});

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { DivisionRepository } from "../../../repositories/divisionRepository";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { TeamRepository } from "../../../repositories/teamRepository";
import { UserRole } from "@task/core";
import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

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

// 役職レベル: 権限昇格チェックに使用
const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.COMPANY_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 2,
  [UserRole.TEAM_ADMIN]: 1,
  [UserRole.USER]: 0,
  [UserRole.GUEST]: -1,
};

const ALLOWED_CALLER_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN, UserRole.TEAM_ADMIN];

export interface InviteUserDeps {
  userRepo: UserRepository;
  divisionRepo: DivisionRepository;
  deptRepo: DepartmentRepository;
  teamRepo: TeamRepository;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeId = (value: unknown): string => isNonEmptyString(value) ? value.trim() : "NONE";

// 管理者が新しいメンバーを組織に招待する
export const createHandler = (deps: InviteUserDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
      return createResponse(403, { error: "Forbidden: You do not have permission to invite users" });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body || "{}") as Record<string, unknown>;
    } catch {
      return createResponse(400, { error: "Invalid request body" });
    }
    const { email, name, role = UserRole.USER, divisionId, departmentId, teamId } = body;

    if (!isNonEmptyString(email) || !isNonEmptyString(name)) {
      return createResponse(400, { error: "Email and name are required" });
    }

    // 付与するロールが有効な UserRole か確認
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return createResponse(400, { error: "Invalid role specified" });
    }

    // 権限昇格を防ぐ: 自分より上位のロールは付与できない
    const callerLevel = ROLE_LEVEL[callerProfile.role as UserRole] ?? 0;
    const invitedLevel = ROLE_LEVEL[role as UserRole] ?? 0;
    if (invitedLevel > callerLevel) {
      return createResponse(403, { error: "Cannot assign a role higher than your own" });
    }

    let effectiveDivisionId = normalizeId(divisionId);
    let effectiveDeptId = normalizeId(departmentId);
    let effectiveTeamId = normalizeId(teamId);

    // Caller-role forcing: always overrides client input
    switch (callerProfile.role as UserRole) {
      case UserRole.TEAM_ADMIN:
        effectiveDivisionId = callerProfile.divisionId;
        effectiveDeptId = callerProfile.departmentId;
        effectiveTeamId = callerProfile.teamId;
        break;
      case UserRole.DEPT_ADMIN:
        effectiveDivisionId = callerProfile.divisionId;
        effectiveDeptId = callerProfile.departmentId;
        if (![UserRole.TEAM_ADMIN, UserRole.USER, UserRole.GUEST].includes(role as UserRole)) {
          effectiveTeamId = "NONE";
        }
        break;
      case UserRole.DIVISION_ADMIN:
        effectiveDivisionId = callerProfile.divisionId;
        break;
      // COMPANY_ADMIN: no caller-based forcing; invited-role forcing applied below
    }

    // Invited-role forcing: applied after caller forcing
    switch (role as UserRole) {
      case UserRole.COMPANY_ADMIN:
        effectiveDivisionId = "NONE";
        effectiveDeptId = "NONE";
        effectiveTeamId = "NONE";
        break;
      case UserRole.DIVISION_ADMIN:
        effectiveDeptId = "NONE";
        effectiveTeamId = "NONE";
        break;
      case UserRole.DEPT_ADMIN:
        effectiveTeamId = "NONE";
        break;
    }

    // Validate required fields per invited role
    if ((role as UserRole) === UserRole.DIVISION_ADMIN && effectiveDivisionId === "NONE") {
      return createResponse(400, { error: "divisionId is required for DIVISION_ADMIN" });
    }
    if ((role as UserRole) === UserRole.DEPT_ADMIN) {
      if (effectiveDivisionId === "NONE") return createResponse(400, { error: "divisionId is required for DEPT_ADMIN" });
      if (effectiveDeptId === "NONE") return createResponse(400, { error: "departmentId is required for DEPT_ADMIN" });
    }
    if ((role as UserRole) === UserRole.TEAM_ADMIN) {
      if (effectiveDivisionId === "NONE") return createResponse(400, { error: "divisionId is required for TEAM_ADMIN" });
      if (effectiveDeptId === "NONE") return createResponse(400, { error: "departmentId is required for TEAM_ADMIN" });
      if (effectiveTeamId === "NONE") return createResponse(400, { error: "teamId is required for TEAM_ADMIN" });
    }

    if (effectiveTeamId !== "NONE" && effectiveDeptId === "NONE") {
      return createResponse(400, { error: "departmentId is required when teamId is specified" });
    }
    if (effectiveDeptId !== "NONE" && effectiveDivisionId === "NONE") {
      return createResponse(400, { error: "divisionId is required when departmentId is specified" });
    }

    if (effectiveDivisionId !== "NONE") {
      const division = await deps.divisionRepo.findById(callerProfile.companyId, effectiveDivisionId);
      if (!division) {
        return createResponse(404, { error: "Division not found in your company" });
      }
    }

    if (effectiveDeptId !== "NONE") {
      const department = await deps.deptRepo.findById(effectiveDivisionId, effectiveDeptId);
      if (!department || department.companyId !== callerProfile.companyId) {
        return createResponse(404, { error: "Department not found in your company" });
      }
      effectiveDivisionId = department.divisionId;
    }

    if (effectiveTeamId !== "NONE") {
      const team = await deps.teamRepo.findById(effectiveDeptId, effectiveTeamId);
      if (!team || team.companyId !== callerProfile.companyId) {
        return createResponse(404, { error: "Team not found in your company" });
      }
      if (team.departmentId !== effectiveDeptId || team.divisionId !== effectiveDivisionId) {
        return createResponse(403, { error: "Team does not belong to the specified department" });
      }
      effectiveDivisionId = team.divisionId;
      effectiveDeptId = team.departmentId;
    }

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

    // companyId はサーバー側 (招待者プロフィール) から決定する
    await deps.userRepo.create({
      userId: newUserId,
      email: email.trim(),
      name: name.trim(),
      role: role as UserRole,
      companyId: callerProfile.companyId,
      divisionId: effectiveDivisionId,
      departmentId: effectiveDeptId,
      teamId: effectiveTeamId,
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
  userRepo: new UserRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  teamRepo: new TeamRepository(tableName),
});

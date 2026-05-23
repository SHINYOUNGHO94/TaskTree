import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TeamRepository } from "@/repositories/teamRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { UserRepository } from "@/repositories/userRepository";
import { UserRole } from "@task/core";
import {
  unauthorized,
  forbidden,
  invalidRequestBody,
  requiredFieldsMissing,
  internalServerError,
  notFound,
} from "@/errors/utils";

export interface CreateTeamDeps {
  repository: TeamRepository;
  deptRepo: DepartmentRepository;
  userRepo: UserRepository;
}

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(body),
});

const ALLOWED_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN];

// COMPANY_ADMIN / DIVISION_ADMIN / DEPT_ADMIN がチームを作成できる
export const createHandler = (deps: CreateTeamDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return unauthorized();
    }

    const callerId = authorizer.claims.sub as string;
    const callerProfile = await deps.userRepo.findByUserId(callerId);
    if (!callerProfile) {
      return forbidden("Profile not found");
    }

    if (!ALLOWED_ROLES.includes(callerProfile.role as UserRole)) {
      return forbidden("Insufficient role to create teams");
    }

    if (!event.body) {
      return invalidRequestBody();
    }

    const { departmentId, divisionId: bodyDivisionId, teamId, name } = JSON.parse(event.body);

    if (!departmentId || !teamId || !name) {
      return requiredFieldsMissing();
    }

    const companyId = callerProfile.companyId;
    let resolvedDivisionId: string;

    if (callerProfile.role === UserRole.DEPT_ADMIN) {
      // DEPT_ADMIN は自分の department 配下にのみ作成可能
      if (departmentId !== callerProfile.departmentId) {
        return forbidden("DEPT_ADMIN can only create teams under their own department");
      }
      const dept = await deps.deptRepo.findById(callerProfile.divisionId, departmentId);
      if (!dept || dept.companyId !== companyId) {
        return notFound("Department not found in your company");
      }
      resolvedDivisionId = callerProfile.divisionId;
    } else if (callerProfile.role === UserRole.DIVISION_ADMIN) {
      // DIVISION_ADMIN は自分の division 配下の department にのみ作成可能
      const dept = await deps.deptRepo.findById(callerProfile.divisionId, departmentId);
      if (!dept || dept.companyId !== companyId) {
        return forbidden("DIVISION_ADMIN can only create teams under departments in their own division");
      }
      resolvedDivisionId = callerProfile.divisionId;
    } else {
      // COMPANY_ADMIN は department の存在と会社所属を検証
      if (!bodyDivisionId) {
        return requiredFieldsMissing();
      }
      const dept = await deps.deptRepo.findById(bodyDivisionId, departmentId);
      if (!dept || dept.companyId !== companyId) {
        return notFound("Department not found in your company");
      }
      resolvedDivisionId = bodyDivisionId;
    }

    await deps.repository.create({ companyId, divisionId: resolvedDivisionId, departmentId, teamId, name });

    return createResponse(201, { message: "Team created successfully", teamId });
  } catch (error) {
    console.error("Error creating team:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new TeamRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  userRepo: new UserRepository(tableName),
});

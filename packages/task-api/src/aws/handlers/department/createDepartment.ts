import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
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

export interface CreateDepartmentDeps {
  repository: DepartmentRepository;
  divRepo: DivisionRepository;
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

const ALLOWED_ROLES = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN];

// COMPANY_ADMIN または DIVISION_ADMIN が部署を作成できる
export const createHandler = (deps: CreateDepartmentDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
      return forbidden("Insufficient role to create departments");
    }

    if (!event.body) {
      return invalidRequestBody();
    }

    const { divisionId, departmentId, name } = JSON.parse(event.body);

    if (!divisionId || !departmentId || !name) {
      return requiredFieldsMissing();
    }

    const companyId = callerProfile.companyId;

    // DIVISION_ADMIN は自分の division 配下にのみ作成可能
    if (callerProfile.role === UserRole.DIVISION_ADMIN && divisionId !== callerProfile.divisionId) {
      return forbidden("DIVISION_ADMIN can only create departments under their own division");
    }

    // divisionId が同一会社に存在するか検証
    const division = await deps.divRepo.findById(companyId, divisionId);
    if (!division) {
      return notFound("Division not found in your company");
    }

    await deps.repository.create({ companyId, divisionId, departmentId, name });

    return createResponse(201, { message: "Department created successfully", departmentId });
  } catch (error) {
    console.error("Error creating department:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new DepartmentRepository(tableName),
  divRepo: new DivisionRepository(tableName),
  userRepo: new UserRepository(tableName),
});

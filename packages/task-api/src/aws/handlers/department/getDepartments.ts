import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { UserRepository } from "../../../repositories/userRepository";

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

export interface GetDepartmentsDeps {
  deptRepo: DepartmentRepository;
  userRepo: UserRepository;
}

export const createHandler = (deps: GetDepartmentsDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authorizer = event.requestContext.authorizer;
    if (!authorizer || !authorizer.claims) {
      return createResponse(401, { error: "Unauthorized" });
    }

    const userId = authorizer.claims.sub as string;
    const user = await deps.userRepo.findByUserId(userId);

    if (!user) {
      return createResponse(403, { error: "Profile not found" });
    }

    const departments = await deps.deptRepo.findByCompanyId(user.companyId);
    departments.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return createResponse(200, { departments });
  } catch (error) {
    console.error("Failed to get departments:", error);
    return createResponse(500, { error: "Internal Server Error" });
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  deptRepo: new DepartmentRepository(tableName),
  userRepo: new UserRepository(tableName)
});

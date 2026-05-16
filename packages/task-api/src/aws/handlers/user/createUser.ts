import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { invalidRequestBody, internalServerError, requiredFieldsMissing } from "@/errors/utils";

export interface CreateUserDeps {
  repository: UserRepository;
}

export const createHandler = (deps: CreateUserDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return invalidRequestBody();
    }

    const params = JSON.parse(event.body);
    const { companyId, divisionId, departmentId, teamId, userId, email, name, role } = params;

    if (!companyId || !userId || !email || !name || !role) {
      return requiredFieldsMissing();
    }

    await deps.repository.create({
      companyId,
      divisionId,
      departmentId,
      teamId,
      userId,
      email,
      name,
      role,
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User created successfully", userId }),
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new UserRepository(tableName)
});

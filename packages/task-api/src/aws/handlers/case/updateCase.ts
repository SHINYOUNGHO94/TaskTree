import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseOwnerType, CaseStatus } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface UpdateCaseDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: UpdateCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) {
        return badRequest("Request body is required");
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["status"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Only status can be updated");
      }

      const { status } = body;
      if (!status || !(Object.values(CaseStatus) as string[]).includes(status as string)) {
        return badRequest("Invalid or missing status value");
      }

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;

      if (!isCreator && !isUserOwner) {
        return forbidden("You do not have permission to update this case");
      }

      const updatedCase = {
        ...existingCase,
        status: status as CaseStatus,
        updatedAt: new Date().toISOString(),
      };

      await deps.caseRepo.save(updatedCase);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  userRepo: new UserRepository(tableName),
});

import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseComment, CaseDetail, CaseOwnerType, CaseTargetScope } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseCommentRepository } from "@/repositories/caseCommentRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

const isAccessAllowed = (
  caseDetail: CaseDetail,
  userId: string,
  teamId: string,
): boolean => {
  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;
  if (caseDetail.targetScope === CaseTargetScope.USER && caseDetail.targetScopeId === userId) return true;
  if (caseDetail.targetScope === CaseTargetScope.TEAM && caseDetail.targetScopeId === teamId) return true;
  return false;
};

export interface CreateCaseCommentDeps {
  caseRepo: CaseRepository;
  caseCommentRepo: CaseCommentRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: CreateCaseCommentDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["content"]);
      const hasUnexpectedField = Object.keys(body).some((field) => !allowedFields.has(field));
      if (hasUnexpectedField) {
        return badRequest("Unexpected field in request body");
      }

      const { content } = body;
      if (typeof content !== "string" || !content.trim()) {
        return badRequest("content is required and must not be empty");
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

      if (!isAccessAllowed(existingCase, userId, profile.teamId)) {
        return forbidden("You do not have access to this case");
      }

      const now = new Date().toISOString();
      const comment: CaseComment = {
        commentId: randomUUID(),
        caseId,
        companyId: profile.companyId,
        authorId: userId,
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await deps.caseCommentRepo.save(comment);

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ commentId: comment.commentId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseCommentRepo: new CaseCommentRepository(tableName),
  userRepo: new UserRepository(tableName),
});

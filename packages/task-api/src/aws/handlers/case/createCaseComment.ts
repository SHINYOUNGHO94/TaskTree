import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseComment, NotificationAction } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseCommentRepository } from "@/repositories/caseCommentRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsAnyParticipant } from "@/services/casePermissionService";
import { saveNotificationsForCase } from "@/services/notificationHelperService";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface CreateCaseCommentDeps {
  caseRepo: CaseRepository;
  caseCommentRepo: CaseCommentRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  notifRepo: NotificationRepository;
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

      const isSameCompany = existingCase.companyId === profile.companyId;

      if (isSameCompany) {
        if (!canReadCase(existingCase, userId, profile)) {
          return forbidden("You do not have access to this case");
        }
      } else {
        let participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
          caseId,
          profile.companyId,
        );
        if (!participantRecord && existingCase.projectId) {
          participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
            existingCase.projectId,
            profile.companyId,
          );
        }
        if (!canReadCaseAsAnyParticipant(existingCase, participantRecord, profile.companyId)) {
          return forbidden("You do not have access to this case");
        }
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

      try {
        await saveNotificationsForCase(
          deps.notifRepo,
          existingCase,
          userId,
          NotificationAction.COMMENT_ADDED,
          `New comment on "${existingCase.title}"`,
          now,
        );
      } catch (notifError) {
        console.error("Failed to save notifications", notifError);
      }

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
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  notifRepo: new NotificationRepository(tableName),
  userRepo: new UserRepository(tableName),
});

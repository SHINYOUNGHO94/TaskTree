import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CaseHistoryAction, CaseOwnerType } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseFileRepository } from "@/repositories/caseFileRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { buildCaseFileKey } from "@/services/s3KeyService";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface ConfirmCaseFileUploadDeps {
  caseRepo: CaseRepository;
  caseFileRepo: CaseFileRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler =
  (deps: ConfirmCaseFileUploadDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext?.authorizer?.claims?.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) return invalidRequestBody();
      let body: unknown;
      try {
        body = JSON.parse(event.body);
      } catch {
        return invalidRequestBody();
      }
      if (typeof body !== "object" || body === null) return invalidRequestBody();

      const { fileId, fileName, contentType, fileSize } = body as Record<string, unknown>;

      if (!fileId || typeof fileId !== "string") return badRequest("fileId is required");
      if (!fileName || typeof fileName !== "string" || fileName.trim().length === 0) {
        return badRequest("fileName is required");
      }
      if (fileName.length > MAX_FILE_NAME_LENGTH) {
        return badRequest(`fileName must not exceed ${MAX_FILE_NAME_LENGTH} characters`);
      }
      if (!contentType || typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
        return badRequest("contentType is not allowed");
      }
      if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
        return badRequest("fileSize must be a positive number not exceeding 20MB");
      }

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");
      if (caseDetail.companyId !== profile.companyId) return forbidden("Access denied");

      const isCreator = caseDetail.creatorId === userId;
      const isUserOwner = caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId;
      if (!isCreator && !isUserOwner) {
        return forbidden("Only the case creator or owner can upload files");
      }

      const objectKey = buildCaseFileKey(profile.companyId, caseId, fileId);

      // S3 HeadObject でアップロード済みであることと metadata の整合性を確認
      let headResult: { ContentLength?: number; ContentType?: string };
      try {
        headResult = await deps.s3Client.send(
          new HeadObjectCommand({ Bucket: deps.bucketName, Key: objectKey }),
        );
      } catch {
        return badRequest("File not found in storage. Please upload the file first.");
      }
      if (headResult.ContentLength !== fileSize) {
        return badRequest("fileSize does not match the uploaded object size.");
      }
      if (headResult.ContentType && headResult.ContentType !== contentType) {
        return badRequest("contentType does not match the uploaded object content type.");
      }

      const now = new Date().toISOString();

      await deps.caseFileRepo.save({
        fileId,
        caseId,
        companyId: caseDetail.companyId,
        uploaderCompanyId: profile.companyId,
        uploadedBy: userId,
        fileName: fileName.trim(),
        contentType,
        fileSize,
        objectKey,
        createdAt: now,
      });

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: caseDetail.companyId,
          actorId: userId,
          action: CaseHistoryAction.FILE_UPLOADED,
          detail: `File "${fileName.trim()}" uploaded`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      const responseBody = {
        fileId,
        caseId,
        companyId: caseDetail.companyId,
        uploaderCompanyId: profile.companyId,
        uploadedBy: userId,
        fileName: fileName.trim(),
        contentType,
        fileSize,
        createdAt: now,
      };

      return {
        statusCode: 201,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(responseBody),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  caseFileRepo: new CaseFileRepository(process.env.TABLE_NAME!),
  caseHistoryRepo: new CaseHistoryRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
  s3Client: new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  bucketName: process.env.CASE_IMAGES_BUCKET!,
});

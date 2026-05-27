import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { CaseOwnerType } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
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

export interface GetCaseFileUploadUrlDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler =
  (deps: GetCaseFileUploadUrlDeps) =>
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

      const { fileName, contentType, fileSize } = body as Record<string, unknown>;

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

      const fileId = randomUUID();
      const objectKey = buildCaseFileKey(profile.companyId, caseId, fileId);

      const { url, fields } = await createPresignedPost(deps.s3Client, {
        Bucket: deps.bucketName,
        Key: objectKey,
        Conditions: [
          { "Content-Type": contentType },
          ["content-length-range", 1, MAX_FILE_SIZE],
        ],
        Fields: { "Content-Type": contentType },
        Expires: 300,
      });

      return {
        statusCode: 200,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify({ url, fields, fileId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
  s3Client: new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  bucketName: process.env.CASE_IMAGES_BUCKET!,
});

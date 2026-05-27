import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { S3Client } from "@aws-sdk/client-s3";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CaseOwnerType } from "@task/core";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const EXT_MAP: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface GetUploadPresignedUrlDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler = (deps: GetUploadPresignedUrlDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) return unauthorized("Missing auth token");

    if (!event.body) return invalidRequestBody();
    let body: unknown;
    try { body = JSON.parse(event.body); } catch { return invalidRequestBody(); }
    if (typeof body !== "object" || body === null) return invalidRequestBody();

    const { caseId, contentType, fileSize } = body as Record<string, unknown>;

    if (!caseId || typeof caseId !== "string") return badRequest("caseId is required");
    if (!contentType || typeof contentType !== "string" || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return badRequest("contentType must be image/png, image/jpeg, or image/webp");
    }
    if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return badRequest("fileSize must be a positive number not exceeding 5MB");
    }

    const [profile, existingCase] = await Promise.all([
      deps.userRepo.findByUserId(userId),
      deps.caseRepo.findById(caseId),
    ]);

    if (!profile) return internalServerError("User profile not found");
    if (!existingCase) return notFound("Case not found");
    if (existingCase.companyId !== profile.companyId) return forbidden("Access denied");

    const isCreator = existingCase.creatorId === userId;
    const isUserOwner = existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;
    if (!isCreator && !isUserOwner) return forbidden("Only the case creator or owner can upload images");

    const ext = EXT_MAP[contentType];
    const objectKey = `${profile.companyId}/cases/${caseId}/images/${randomUUID()}.${ext}`;

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
      body: JSON.stringify({ url, fields, objectKey }),
    };
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
  s3Client: new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  bucketName: process.env.CASE_IMAGES_BUCKET!,
});

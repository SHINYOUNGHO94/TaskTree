import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsParticipant } from "@/services/casePermissionService";
import {
  badRequest,
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface GetReadPresignedUrlDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler = (deps: GetReadPresignedUrlDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) return unauthorized("Missing auth token");

    const objectKey = event.queryStringParameters?.key;
    if (!objectKey || typeof objectKey !== "string") {
      return badRequest("key query parameter is required");
    }

    // key format: {companyId}/cases/{caseId}/images/{filename}
    const parts = objectKey.split("/");
    if (parts.length !== 5 || parts[1] !== "cases" || parts[3] !== "images") {
      return badRequest("Invalid objectKey format");
    }
    const companyIdFromKey = parts[0];
    const caseId = parts[2];

    const [profile, existingCase] = await Promise.all([
      deps.userRepo.findByUserId(userId),
      deps.caseRepo.findById(caseId),
    ]);

    if (!profile) return internalServerError("User profile not found");
    if (!existingCase) return notFound("Case not found");
    if (existingCase.companyId !== companyIdFromKey) return forbidden("Access denied");

    const isSameCompany = existingCase.companyId === profile.companyId;

    if (isSameCompany) {
      if (!canReadCase(existingCase, userId, profile)) {
        return forbidden("Access denied");
      }
    } else {
      const participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
        caseId,
        profile.companyId,
      );
      if (!canReadCaseAsParticipant(existingCase, participantRecord, profile.companyId)) {
        return forbidden("Access denied");
      }
    }

    const command = new GetObjectCommand({ Bucket: deps.bucketName, Key: objectKey });
    const readUrl = await getSignedUrl(deps.s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: RESPONSE_HEADERS,
      body: JSON.stringify({ readUrl }),
    };
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  participantCompanyRepo: new CaseParticipantCompanyRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
  s3Client: new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  bucketName: process.env.CASE_IMAGES_BUCKET!,
});

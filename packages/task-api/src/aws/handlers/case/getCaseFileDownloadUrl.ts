import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseFileRepository } from "@/repositories/caseFileRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { canReadCase, canReadCaseAsAnyParticipant } from "@/services/casePermissionService";
import { parseCaseFileKey } from "@/services/s3KeyService";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface GetCaseFileDownloadUrlDeps {
  caseRepo: CaseRepository;
  caseFileRepo: CaseFileRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler =
  (deps: GetCaseFileDownloadUrlDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext?.authorizer?.claims?.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      const fileId = event.pathParameters?.fileId;
      if (!caseId || !fileId) return notFound("File not found");

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");

      // case 権限確認 → file record 取得 の順序を守る
      const isSameCompany = caseDetail.companyId === profile.companyId;

      if (isSameCompany) {
        if (!canReadCase(caseDetail, userId, profile)) {
          return forbidden("Access denied");
        }
      } else {
        let participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
          caseId,
          profile.companyId,
        );
        if (!participantRecord && caseDetail.projectId) {
          participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
            caseDetail.projectId,
            profile.companyId,
          );
        }
        if (!canReadCaseAsAnyParticipant(caseDetail, participantRecord, profile.companyId)) {
          return forbidden("Access denied");
        }
      }

      const fileRecord = await deps.caseFileRepo.findByFileId(caseId, fileId);
      if (!fileRecord) return notFound("File not found");

      const keyParts = parseCaseFileKey(fileRecord.objectKey);
      if (
        !keyParts ||
        keyParts.companyId !== fileRecord.companyId ||
        keyParts.caseId !== caseId ||
        keyParts.fileId !== fileId
      ) {
        return internalServerError("File record integrity error");
      }

      // S3 に実際にオブジェクトが存在するか確認（DynamoDB orphan record 検出）
      try {
        await deps.s3Client.send(
          new HeadObjectCommand({ Bucket: deps.bucketName, Key: fileRecord.objectKey }),
        );
      } catch {
        return notFound("File not found in storage");
      }

      const encodedFileName = encodeURIComponent(fileRecord.fileName);
      const command = new GetObjectCommand({
        Bucket: deps.bucketName,
        Key: fileRecord.objectKey,
        ResponseContentDisposition: `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
      });
      const downloadUrl = await getSignedUrl(deps.s3Client, command, { expiresIn: 3600 });

      return {
        statusCode: 200,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify({ downloadUrl }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

export const handler = createHandler({
  caseRepo: new CaseRepository(process.env.TABLE_NAME!),
  caseFileRepo: new CaseFileRepository(process.env.TABLE_NAME!),
  participantCompanyRepo: new CaseParticipantCompanyRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
  s3Client: new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  bucketName: process.env.CASE_IMAGES_BUCKET!,
});

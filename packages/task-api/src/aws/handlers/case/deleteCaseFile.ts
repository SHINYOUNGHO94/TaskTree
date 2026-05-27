import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CaseHistoryAction, CaseOwnerType } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseFileRepository } from "@/repositories/caseFileRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { parseCaseFileKey } from "@/services/s3KeyService";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface DeleteCaseFileDeps {
  caseRepo: CaseRepository;
  caseFileRepo: CaseFileRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
  s3Client: S3Client;
  bucketName: string;
}

export const createHandler =
  (deps: DeleteCaseFileDeps) =>
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
      if (caseDetail.companyId !== profile.companyId) return forbidden("Access denied");

      const isCreator = caseDetail.creatorId === userId;
      const isUserOwner = caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId;
      if (!isCreator && !isUserOwner) {
        return forbidden("Only the case creator or owner can delete files");
      }

      const fileRecord = await deps.caseFileRepo.findByFileId(caseId, fileId);
      if (!fileRecord) return notFound("File not found");

      const keyParts = parseCaseFileKey(fileRecord.objectKey);
      if (
        !keyParts ||
        keyParts.companyId !== profile.companyId ||
        keyParts.caseId !== caseId ||
        keyParts.fileId !== fileId
      ) {
        return internalServerError("File record integrity error");
      }

      // S3 削除を先に実行。失敗時は DynamoDB record を保持して 500 を返す
      await deps.s3Client.send(
        new DeleteObjectCommand({ Bucket: deps.bucketName, Key: fileRecord.objectKey }),
      );

      // S3 削除成功後に DynamoDB record を削除
      await deps.caseFileRepo.deleteByFileId(caseId, fileId);

      const now = new Date().toISOString();
      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: caseDetail.companyId,
          actorId: userId,
          action: CaseHistoryAction.FILE_DELETED,
          detail: `File "${fileRecord.fileName}" deleted`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 200,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify({ fileId }),
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

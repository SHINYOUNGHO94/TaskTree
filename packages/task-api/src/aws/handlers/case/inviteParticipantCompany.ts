import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseDeliveryType,
  CaseHistoryAction,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseParticipantType,
  CaseType,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface InviteParticipantCompanyDeps {
  caseRepo: CaseRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  caseHistoryRepo: CaseHistoryRepository;
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
}

export const createHandler =
  (deps: InviteParticipantCompanyDeps) =>
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

      if (typeof body !== "object" || body === null) return invalidRequestBody();

      const allowedFields = new Set(["companyId", "participantType"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Unexpected field in request body");
      }

      const { companyId: targetCompanyId, participantType: rawParticipantType } = body;
      if (typeof targetCompanyId !== "string" || !targetCompanyId.trim()) {
        return badRequest("companyId is required");
      }

      const validTypes = [CaseParticipantType.COLLABORATOR, CaseParticipantType.CLIENT] as string[];
      if (rawParticipantType !== undefined && !validTypes.includes(rawParticipantType as string)) {
        return badRequest("participantType must be COLLABORATOR or CLIENT");
      }
      const participantType: CaseParticipantType =
        (rawParticipantType as CaseParticipantType | undefined) ?? CaseParticipantType.COLLABORATOR;

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");

      if (caseDetail.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (participantType === CaseParticipantType.COLLABORATOR) {
        if (caseDetail.deliveryType !== CaseDeliveryType.OPEN) {
          return badRequest("COLLABORATOR can only be invited to OPEN cases");
        }
      } else {
        // CLIENT
        if (caseDetail.caseType !== CaseType.PROJECT) {
          return badRequest("CLIENT can only be invited to PROJECT cases");
        }
      }

      const isCreator = caseDetail.creatorId === userId;
      const isUserOwner =
        caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId;
      if (!isCreator && !isUserOwner) {
        return forbidden("Only the case creator or owner can invite participant companies");
      }

      if (targetCompanyId.trim() === profile.companyId) {
        return badRequest("Cannot invite your own company");
      }

      const targetCompany = await deps.companyRepo.findById(targetCompanyId.trim());
      if (!targetCompany) return notFound("Target company not found");

      const existing = await deps.participantCompanyRepo.findByCaseAndCompany(
        caseId,
        targetCompanyId.trim(),
      );
      if (
        existing &&
        (existing.status === CaseParticipantCompanyStatus.INVITED ||
          existing.status === CaseParticipantCompanyStatus.ACTIVE)
      ) {
        return badRequest("This company is already invited or active for this case");
      }

      const now = new Date().toISOString();
      const participantCompany = {
        participantCompanyId: targetCompanyId.trim(),
        caseId,
        ownerCompanyId: profile.companyId,
        companyId: targetCompanyId.trim(),
        companyName: targetCompany.name ?? null,
        status: CaseParticipantCompanyStatus.INVITED,
        participantType,
        invitedBy: userId,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await deps.participantCompanyRepo.save(participantCompany);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: profile.companyId,
          actorId: userId,
          action: CaseHistoryAction.PARTICIPANT_COMPANY_INVITED,
          detail: `Company ${targetCompanyId.trim()} invited`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ participantCompanyId: targetCompanyId.trim() }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  userRepo: new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
});

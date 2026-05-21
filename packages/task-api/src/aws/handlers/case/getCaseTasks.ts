import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseTargetScope,
  UserProfile,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} from "@/errors/utils";

const isInternalAccessAllowed = (
  caseDetail: CaseDetail,
  userId: string,
  profile: UserProfile,
): boolean => {
  if (caseDetail.creatorId === userId) return true;
  if (caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId) return true;

  switch (caseDetail.targetScope) {
    case CaseTargetScope.COMPANY:
      return caseDetail.targetScopeId === profile.companyId;
    case CaseTargetScope.DIVISION:
      return caseDetail.targetScopeId === profile.divisionId;
    case CaseTargetScope.DEPARTMENT:
      return caseDetail.targetScopeId === profile.departmentId;
    case CaseTargetScope.TEAM:
      return caseDetail.targetScopeId === profile.teamId;
    case CaseTargetScope.USER:
      return caseDetail.targetScopeId === userId;
  }

  return false;
};

export interface GetCaseTasksDeps {
  caseRepo: CaseRepository;
  caseTaskRepo: CaseTaskRepository;
  participantCompanyRepo: CaseParticipantCompanyRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetCaseTasksDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      const isSameCompany = existingCase.companyId === profile.companyId;

      if (isSameCompany) {
        if (!isInternalAccessAllowed(existingCase, userId, profile)) {
          return forbidden("You do not have access to this case");
        }
      } else {
        if (existingCase.deliveryType !== CaseDeliveryType.OPEN) {
          return forbidden("You do not have access to this case");
        }

        const participantRecord = await deps.participantCompanyRepo.findByCaseAndCompany(
          caseId,
          profile.companyId,
        );
        if (!participantRecord || participantRecord.status !== CaseParticipantCompanyStatus.ACTIVE) {
          return forbidden("You do not have access to this case");
        }
      }

      const tasks = await deps.caseTaskRepo.findByCaseId(caseId);

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(tasks),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseTaskRepo: new CaseTaskRepository(tableName),
  participantCompanyRepo: new CaseParticipantCompanyRepository(tableName),
  userRepo: new UserRepository(tableName),
});

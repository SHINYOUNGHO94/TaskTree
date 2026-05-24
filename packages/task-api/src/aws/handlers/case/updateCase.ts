import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CaseDetail, CaseHistoryAction, CaseOwnerType, CaseStatus } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";

export interface UpdateCaseDeps {
  caseRepo: CaseRepository;
  caseHistoryRepo: CaseHistoryRepository;
  assignmentRepo: CaseAssignmentRepository;
  visibilityRepo: CaseVisibilityRepository;
  userRepo: UserRepository;
}

const saveCaseAndAccessRecords = async (
  deps: Pick<UpdateCaseDeps, "caseRepo" | "assignmentRepo" | "visibilityRepo">,
  caseDetail: CaseDetail,
): Promise<void> => {
  if (typeof deps.caseRepo.saveWithAccessRecords === "function") {
    await deps.caseRepo.saveWithAccessRecords(caseDetail);
    return;
  }

  await deps.caseRepo.save(caseDetail);
  await Promise.all([
    deps.assignmentRepo.save(caseDetail),
    deps.visibilityRepo.save(caseDetail),
  ]);
};

export const createHandler =
  (deps: UpdateCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      if (!event.body) {
        return badRequest("Request body is required");
      }

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      if (typeof body !== "object" || body === null) {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["status"]);
      if (Object.keys(body).some((key) => !allowedFields.has(key))) {
        return badRequest("Only status can be updated");
      }

      const { status } = body;
      if (!status || !(Object.values(CaseStatus) as string[]).includes(status as string)) {
        return badRequest("Invalid or missing status value");
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

      const isCreator = existingCase.creatorId === userId;
      const isUserOwner =
        existingCase.ownerType === CaseOwnerType.USER && existingCase.ownerId === userId;

      if (!isCreator && !isUserOwner) {
        return forbidden("You do not have permission to update this case");
      }

      const newStatus = status as CaseStatus;

      // Validate: cannot complete a case if child cases are still incomplete
      if (newStatus === CaseStatus.COMPLETED) {
        const children = await deps.caseRepo.findChildrenByParentCaseId(existingCase.caseId);
        const incomplete = children.filter(
          (c) => c.status !== CaseStatus.COMPLETED && c.status !== CaseStatus.CANCELED,
        );
        if (incomplete.length > 0) {
          return badRequest("All sub-cases must be completed before completing this case");
        }
      }

      const now = new Date().toISOString();
      const updatedCase = {
        ...existingCase,
        status: newStatus,
        updatedAt: now,
      };

      await saveCaseAndAccessRecords(deps, updatedCase);

      try {
        await deps.caseHistoryRepo.save({
          historyId: randomUUID(),
          caseId,
          companyId: profile.companyId,
          actorId: userId,
          action: CaseHistoryAction.STATUS_CHANGED,
          detail: `Status changed from ${existingCase.status} to ${newStatus}`,
          createdAt: now,
        });
      } catch (historyError) {
        console.error("Failed to write case history", historyError);
      }

      // Auto-propagate: if completed and has parent, check if all siblings done → parent → REVIEW_REQUESTED
      if (newStatus === CaseStatus.COMPLETED && existingCase.parentCaseId) {
        try {
          const siblings = await deps.caseRepo.findChildrenByParentCaseId(existingCase.parentCaseId);
          const allSiblingsDone = siblings.every(
            (s) =>
              s.caseId === existingCase.caseId
                ? true // current case already updated to COMPLETED
                : s.status === CaseStatus.COMPLETED || s.status === CaseStatus.CANCELED,
          );
          if (allSiblingsDone) {
            const parentCase = await deps.caseRepo.findById(existingCase.parentCaseId);
            if (
              parentCase &&
              parentCase.status !== CaseStatus.COMPLETED &&
              parentCase.status !== CaseStatus.REVIEW_REQUESTED &&
              parentCase.status !== CaseStatus.CANCELED
            ) {
              const parentNow = new Date().toISOString();
              const updatedParent = {
                ...parentCase,
                status: CaseStatus.REVIEW_REQUESTED,
                updatedAt: parentNow,
              };
              await saveCaseAndAccessRecords(deps, updatedParent);
              await deps.caseHistoryRepo.save({
                historyId: randomUUID(),
                caseId: parentCase.caseId,
                companyId: parentCase.companyId,
                actorId: userId,
                action: CaseHistoryAction.STATUS_CHANGED,
                detail: `Status auto-changed to REVIEW_REQUESTED: all sub-cases completed`,
                createdAt: parentNow,
              });
            }
          }
        } catch (propagationError) {
          console.error("Failed to propagate completion to parent case", propagationError);
        }
      }

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ caseId }),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  caseHistoryRepo: new CaseHistoryRepository(tableName),
  assignmentRepo: new CaseAssignmentRepository(tableName),
  visibilityRepo: new CaseVisibilityRepository(tableName),
  userRepo: new UserRepository(tableName),
});

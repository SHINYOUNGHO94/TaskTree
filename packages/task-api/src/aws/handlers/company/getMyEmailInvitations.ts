import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CompanyEmailInvitationRepository } from "@/repositories/companyEmailInvitationRepository";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

export interface GetMyEmailInvitationsDeps {
  invitationRepo: CompanyEmailInvitationRepository;
  caseRepo: CaseRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetMyEmailInvitationsDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const invitations = await deps.invitationRepo.findByEmail(profile.email);
      const pending = invitations.filter((inv) => inv.status === "PENDING");

      const results = await Promise.all(
        pending.map(async (inv) => {
          const caseDetail = await deps.caseRepo.findById(inv.caseId).catch(() => null);
          return {
            invitationId: inv.invitationId,
            email: inv.email,
            caseId: inv.caseId,
            caseTitle: caseDetail?.title ?? null,
            caseType: caseDetail?.caseType ?? null,
            caseStatus: caseDetail?.status ?? null,
            ownerCompanyId: inv.ownerCompanyId,
            status: inv.status,
            createdAt: inv.createdAt,
          };
        })
      );

      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(results),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  invitationRepo: new CompanyEmailInvitationRepository(tableName),
  caseRepo: new CaseRepository(tableName),
  userRepo: new UserRepository(tableName),
});

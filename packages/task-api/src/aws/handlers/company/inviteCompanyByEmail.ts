import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminCreateUserCommand, UsernameExistsException } from "@aws-sdk/client-cognito-identity-provider";
import { CompanyEmailInvitationRecord } from "@/aws/entities/items/companyEmailInvitationRecord";
import { CompanyEmailInvitationRepository } from "@/repositories/companyEmailInvitationRepository";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import {
  badRequest,
  forbidden,
  internalServerError,
  invalidRequestBody,
  notFound,
  unauthorized,
} from "@/errors/utils";
import { CaseDeliveryType, CaseOwnerType } from "@task/core";

const userPoolId = process.env.USER_POOL_ID || "";
const cognitoClient = new CognitoIdentityProviderClient({});

export interface InviteCompanyByEmailDeps {
  invitationRepo: CompanyEmailInvitationRepository;
  caseRepo: CaseRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: InviteCompanyByEmailDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      if (!event.body) return badRequest("Request body is required");

      let body: Record<string, unknown>;
      try {
        body = JSON.parse(event.body) as Record<string, unknown>;
      } catch {
        return invalidRequestBody();
      }

      const allowedFields = new Set(["email", "caseId"]);
      if (Object.keys(body).some((k) => !allowedFields.has(k))) {
        return badRequest("Unexpected field in request body");
      }

      const { email, caseId } = body;
      if (typeof email !== "string" || !email.trim()) return badRequest("email is required");
      if (typeof caseId !== "string" || !caseId.trim()) return badRequest("caseId is required");

      const [profile, caseDetail] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId.trim()),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!caseDetail) return notFound("Case not found");
      if (caseDetail.companyId !== profile.companyId) return forbidden("You do not have access to this case");
      if (caseDetail.deliveryType !== CaseDeliveryType.OPEN) {
        return badRequest("Only OPEN cases can invite partner companies");
      }

      const isCreator = caseDetail.creatorId === userId;
      const isOwner = caseDetail.ownerType === CaseOwnerType.USER && caseDetail.ownerId === userId;
      if (!isCreator && !isOwner) return forbidden("Only the case creator or owner can invite partner companies");

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await deps.invitationRepo.findByEmailAndCase(normalizedEmail, caseId.trim());
      if (existing && existing.status === "PENDING") {
        return badRequest("This email has already been invited to this case");
      }

      const now = new Date().toISOString();
      const invitationId = randomUUID();

      await deps.invitationRepo.save({
        pk: CompanyEmailInvitationRecord.makePk(),
        sk: CompanyEmailInvitationRecord.makeSk(normalizedEmail, caseId.trim()),
        invitationId,
        email: normalizedEmail,
        caseId: caseId.trim(),
        ownerCompanyId: profile.companyId,
        status: "PENDING",
        createdAt: now,
      });

      try {
        await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: normalizedEmail,
            UserAttributes: [
              { Name: "email", Value: normalizedEmail },
              { Name: "email_verified", Value: "true" },
            ],
            DesiredDeliveryMediums: ["EMAIL"],
          })
        );
      } catch (err) {
        if (err instanceof UsernameExistsException) {
          // Already registered — invitation record is saved, they'll see it on next login
        } else {
          console.error("Cognito AdminCreateUser failed", err);
          return internalServerError("Failed to send invitation email");
        }
      }

      return {
        statusCode: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ invitationId }),
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

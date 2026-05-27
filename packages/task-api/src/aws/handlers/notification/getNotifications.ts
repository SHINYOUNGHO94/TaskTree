import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, unauthorized } from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface GetNotificationsDeps {
  notifRepo: NotificationRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: GetNotificationsDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext?.authorizer?.claims?.sub;
      if (!userId) return unauthorized();

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      const notifications = await deps.notifRepo.findByRecipient(userId, 50);

      const filtered = notifications.filter((n) => n.companyId === profile.companyId);

      return {
        statusCode: 200,
        headers: RESPONSE_HEADERS,
        body: JSON.stringify(filtered),
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

export const handler = createHandler({
  notifRepo: new NotificationRepository(process.env.TABLE_NAME!),
  userRepo: new UserRepository(process.env.TABLE_NAME!),
});

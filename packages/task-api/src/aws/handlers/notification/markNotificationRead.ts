import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { UserRepository } from "@/repositories/userRepository";
import { internalServerError, notFound, unauthorized } from "@/errors/utils";

const RESPONSE_HEADERS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

export interface MarkNotificationReadDeps {
  notifRepo: NotificationRepository;
  userRepo: UserRepository;
}

export const createHandler =
  (deps: MarkNotificationReadDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext?.authorizer?.claims?.sub;
      if (!userId) return unauthorized();

      const notificationId = event.pathParameters?.notificationId;
      if (!notificationId) return notFound("Notification not found");

      const profile = await deps.userRepo.findByUserId(userId);
      if (!profile) return internalServerError("User profile not found");

      try {
        await deps.notifRepo.markRead(userId, notificationId, profile.companyId);
      } catch (err: unknown) {
        const name = err instanceof Error ? err.name : "";
        if (name === "ConditionalCheckFailedException") {
          return notFound("Notification not found");
        }
        throw err;
      }

      return {
        statusCode: 204,
        headers: RESPONSE_HEADERS,
        body: "",
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

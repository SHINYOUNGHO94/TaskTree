import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getCompanyUsers";

const eventWithUser = (userId: string) =>
  ({
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    },
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutUser = () =>
  ({
    requestContext: {},
  }) as unknown as APIGatewayProxyEvent;

const parseBody = <T>(body: string) => JSON.parse(body) as T;

describe("getCompanyUsers", () => {
  it("get company users", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({
        User: "admin-user",
        companyId: "COMP-1",
      }),
      findByCompanyId: vi.fn().mockResolvedValue([
        {
          User: "USER-1",
          email: "new@example.com",
          name: "New User",
          role: UserRole.USER,
          companyId: "COMP-1",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          at: "2026-05-17T09:00:00.000Z",
          update_at: "2026-05-17T10:00:00.000Z",
        },
        {
          User: "USER-2",
          email: "old@example.com",
          name: "Old User",
          role: UserRole.GUEST,
          companyId: "COMP-1",
        },
      ]),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo });
    const response = await handler(eventWithUser("admin-user"));
    const body = parseBody<{ users: { userId: string; createdAt: string; lastSignInAt: string | null }[] }>(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.users).toHaveLength(2);
    expect(body.users[0].userId).toBe("USER-1");
    expect(body.users[1].createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(body.users[1].lastSignInAt).toBeNull();
  });

  it("no auth test", async () => {
    const userRepo = {
      findByUserId: vi.fn(),
      findByCompanyId: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo });
    const response = await handler(eventWithoutUser());

    expect(response.statusCode).toBe(401);
    expect(userRepo.findByUserId).not.toHaveBeenCalled();
  });
});

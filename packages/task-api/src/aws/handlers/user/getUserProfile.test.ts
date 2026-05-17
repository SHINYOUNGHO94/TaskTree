import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { CompanyRepository } from "@/repositories/companyRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getUserProfile";

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

const parseBody = <T>(body: string) => JSON.parse(body) as T;

describe("getUserProfile", () => {
  it("get user profile", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({
        User: "USER-1",
        email: "user@example.com",
        name: "Test User",
        role: UserRole.TEAM_ADMIN,
        companyId: "COMP-1",
        divisionId: "DIV-1",
        departmentId: "DEPT-1",
        teamId: "TEAM-1",
      }),
    } as unknown as UserRepository;

    const companyRepo = {
      findById: vi.fn().mockResolvedValue({ name: "Task Company" }),
    } as unknown as CompanyRepository;

    const divisionRepo = {
      findById: vi.fn().mockResolvedValue({ name: "Product Division" }),
    } as unknown as DivisionRepository;

    const deptRepo = {
      findById: vi.fn().mockResolvedValue({ name: "Web Department" }),
    } as unknown as DepartmentRepository;

    const teamRepo = {
      findById: vi.fn().mockResolvedValue({ name: "Frontend Team" }),
    } as unknown as TeamRepository;

    const handler = createHandler({ userRepo, companyRepo, divisionRepo, deptRepo, teamRepo });
    const response = await handler(eventWithUser("USER-1"));
    const body = parseBody<{ userId: string; companyName: string | null; createdAt: string; lastSignInAt: string | null }>(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.userId).toBe("USER-1");
    expect(body.companyName).toBe("Task Company");
    expect(body.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(body.lastSignInAt).toBeNull();
  });
});

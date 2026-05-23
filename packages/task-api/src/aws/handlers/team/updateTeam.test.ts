import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./updateTeam";

const eventWithAuth = (sub: string, id: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (id: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    pathParameters: { id },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const mockCompanyAdmin = {
  User: "admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "NONE",
  role: UserRole.COMPANY_ADMIN,
};

const mockDivisionAdmin = {
  User: "div-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "NONE",
  teamId: "NONE",
  role: UserRole.DIVISION_ADMIN,
};

const mockDeptAdmin = {
  User: "dept-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "NONE",
  role: UserRole.DEPT_ADMIN,
};

const mockTeam = {
  teamId: "TEAM-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  name: "フロントエンドチーム",
};

const validBody = { name: "新しいチーム名" };

describe("updateTeam", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as TeamRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithoutAuth("TEAM-1", validBody));

    expect(response.statusCode).toBe(401);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("USER ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("user", "TEAM-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("team-admin", "TEAM-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("不正な JSON は 400 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const event = {
      requestContext: { authorizer: { claims: { sub: "admin-1" } } },
      pathParameters: { id: "TEAM-1" },
      body: "{ invalid json",
    } as unknown as APIGatewayProxyEvent;
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("存在しないチームは 404 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-NONEXISTENT", validBody));

    expect(response.statusCode).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN が自分の department 外のチームを更新しようとすると 403 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue({ ...mockTeam, departmentId: "DEPT-OTHER" }),
      update: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("dept-admin-1", "TEAM-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外のチームを更新しようとすると 403 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue({ ...mockTeam, divisionId: "DIV-OTHER" }),
      update: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("div-admin-1", "TEAM-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN はチームを正常に更新できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-1", validBody));

    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith("DEPT-1", "TEAM-1", "新しいチーム名");
  });

  it("DEPT_ADMIN は自分の department 内のチームを更新できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("dept-admin-1", "TEAM-1", validBody));

    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith("DEPT-1", "TEAM-1", "新しいチーム名");
  });
});

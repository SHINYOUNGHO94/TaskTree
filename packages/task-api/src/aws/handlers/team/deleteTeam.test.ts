import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./deleteTeam";

const eventWithAuth = (sub: string, id: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id },
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (id: string): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    pathParameters: { id },
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const mockCompanyAdmin = {
  User: "admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "NONE",
  role: UserRole.COMPANY_ADMIN,
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

describe("deleteTeam", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), deleteById: vi.fn() } as unknown as TeamRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithoutAuth("TEAM-1"));

    expect(response.statusCode).toBe(401);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("USER ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), deleteById: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("user", "TEAM-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), deleteById: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("team-admin", "TEAM-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("存在しないチームは 404 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      findByTeamId: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-NONEXISTENT"));

    expect(response.statusCode).toBe(404);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN が自分の department 外のチームを削除しようとすると 403 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue({ ...mockTeam, departmentId: "DEPT-OTHER" }),
      deleteById: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
      findByTeamId: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("dept-admin-1", "TEAM-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("所属ユーザーが存在する場合は 400 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      deleteById: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      findByTeamId: vi.fn().mockResolvedValue([{ User: "user-1" }]),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-1"));

    expect(response.statusCode).toBe(400);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("他社にユーザーがいても同会社のユーザーがいなければ削除できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      // companyId フィルタ済みで 0 件 (他社のユーザーは除外されている)
      findByTeamId: vi.fn().mockResolvedValue([]),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-1"));

    expect(response.statusCode).toBe(200);
    expect(userRepo.findByTeamId).toHaveBeenCalledWith("TEAM-1", "COMP-1");
    expect(repository.deleteById).toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は空のチームを正常に削除できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      findByTeamId: vi.fn().mockResolvedValue([]),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-1"));

    expect(response.statusCode).toBe(200);
    expect(repository.deleteById).toHaveBeenCalledWith("DEPT-1", "TEAM-1");
  });

  it("DEPT_ADMIN は自分の department 内の空チームを削除できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockTeam),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
      findByTeamId: vi.fn().mockResolvedValue([]),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("dept-admin-1", "TEAM-1"));

    expect(response.statusCode).toBe(200);
    expect(repository.deleteById).toHaveBeenCalledWith("DEPT-1", "TEAM-1");
  });

  it("tenant 分離: findByIdInCompany が undefined を返す場合は 404", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn(),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      findByTeamId: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "TEAM-OTHER-COMPANY"));

    expect(response.statusCode).toBe(404);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});

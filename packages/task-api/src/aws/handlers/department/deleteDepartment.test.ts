import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./deleteDepartment";

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
  departmentId: "NONE",
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

const mockDepartment = {
  departmentId: "DEPT-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  name: "開発部",
};

describe("deleteDepartment", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), deleteById: vi.fn() } as unknown as DepartmentRepository;
    const teamRepo = { findByDepartmentId: vi.fn() } as unknown as TeamRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithoutAuth("DEPT-1"));

    expect(response.statusCode).toBe(401);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), deleteById: vi.fn() } as unknown as DepartmentRepository;
    const teamRepo = { findByDepartmentId: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("team-admin", "DEPT-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("存在しない部署は 404 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn(),
    } as unknown as DepartmentRepository;
    const teamRepo = { findByDepartmentId: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-NONEXISTENT"));

    expect(response.statusCode).toBe(404);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外の部署を削除しようとすると 403 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue({ ...mockDepartment, divisionId: "DIV-OTHER" }),
      deleteById: vi.fn(),
    } as unknown as DepartmentRepository;
    const teamRepo = { findByDepartmentId: vi.fn() } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("div-admin-1", "DEPT-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("チームが存在する場合は 400 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      deleteById: vi.fn(),
    } as unknown as DepartmentRepository;
    const teamRepo = {
      findByDepartmentId: vi.fn().mockResolvedValue([{ teamId: "TEAM-1" }]),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDepartmentId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-1"));

    expect(response.statusCode).toBe(400);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("所属ユーザーが存在する場合は 400 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      deleteById: vi.fn(),
    } as unknown as DepartmentRepository;
    const teamRepo = {
      findByDepartmentId: vi.fn().mockResolvedValue([]),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDepartmentId: vi.fn().mockResolvedValue(true),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-1"));

    expect(response.statusCode).toBe(400);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("他社にチームがあっても同会社配下にチームがなければ削除できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const teamRepo = {
      // companyId フィルタ済みで 0 件 (他社のチームは除外されている)
      findByDepartmentId: vi.fn().mockResolvedValue([]),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDepartmentId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-1"));

    expect(response.statusCode).toBe(200);
    expect(teamRepo.findByDepartmentId).toHaveBeenCalledWith("DEPT-1", "COMP-1");
    expect(repository.deleteById).toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は空の部署を正常に削除できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const teamRepo = {
      findByDepartmentId: vi.fn().mockResolvedValue([]),
    } as unknown as TeamRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDepartmentId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, teamRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-1"));

    expect(response.statusCode).toBe(200);
    expect(repository.deleteById).toHaveBeenCalledWith("DIV-1", "DEPT-1");
  });
});

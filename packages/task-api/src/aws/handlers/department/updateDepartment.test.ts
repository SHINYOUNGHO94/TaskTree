import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { createHandler } from "./updateDepartment";

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

const validBody = { name: "新しい部署名" };

describe("updateDepartment", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithoutAuth("DEPT-1", validBody));

    expect(response.statusCode).toBe(401);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("team-admin", "DEPT-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("不正な JSON は 400 を返す", async () => {
    const repository = { findByIdInCompany: vi.fn(), update: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const event = {
      requestContext: { authorizer: { claims: { sub: "admin-1" } } },
      pathParameters: { id: "DEPT-1" },
      body: "{ invalid json",
    } as unknown as APIGatewayProxyEvent;
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("存在しない部署は 404 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-NONEXISTENT", validBody));

    expect(response.statusCode).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外の部署を更新しようとすると 403 を返す", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue({ ...mockDepartment, divisionId: "DIV-OTHER" }),
      update: vi.fn(),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("div-admin-1", "DEPT-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は部署を正常に更新できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-1", validBody));

    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith("DIV-1", "DEPT-1", "新しい部署名");
  });

  it("DIVISION_ADMIN は自分の division 内の部署を更新できる", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(mockDepartment),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("div-admin-1", "DEPT-1", validBody));

    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith("DIV-1", "DEPT-1", "新しい部署名");
  });

  it("tenant 分離: findByIdInCompany が undefined を返す場合は 404", async () => {
    const repository = {
      findByIdInCompany: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DEPT-OTHER-COMPANY", validBody));

    expect(response.statusCode).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

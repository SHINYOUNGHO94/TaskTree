import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { createHandler } from "./createDepartment";

const eventWithAuth = (sub: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: {},
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

const mockDivision = {
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "第一事業部",
};

const validBody = { divisionId: "DIV-1", departmentId: "DEPT-NEW", name: "新部署" };

describe("createDepartment", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DepartmentRepository;
    const divRepo = { findById: vi.fn() } as unknown as DivisionRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(eventWithoutAuth(validBody));

    expect(response.statusCode).toBe(401);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DepartmentRepository;
    const divRepo = { findById: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("USER ロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DepartmentRepository;
    const divRepo = { findById: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外の divisionId で部署を作成しようとすると 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DepartmentRepository;
    const divRepo = { findById: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin), // divisionId: "DIV-1"
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(
      eventWithAuth("div-admin-1", { ...validBody, divisionId: "DIV-OTHER" })
    );

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("存在しない divisionId を指定すると 404 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DepartmentRepository;
    const divRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(
      eventWithAuth("admin-1", { ...validBody, divisionId: "DIV-NONEXISTENT" })
    );

    expect(response.statusCode).toBe(404);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は有効な divisionId があれば部署を作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const divRepo = {
      findById: vi.fn().mockResolvedValue(mockDivision),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("DIVISION_ADMIN は自分の division 配下に部署を作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const divRepo = {
      findById: vi.fn().mockResolvedValue(mockDivision),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    const response = await handler(eventWithAuth("div-admin-1", validBody));

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("クライアントから companyId を渡しても、サーバー側の companyId が使用される", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const divRepo = {
      findById: vi.fn().mockResolvedValue(mockDivision),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, divRepo, userRepo });
    await handler(eventWithAuth("admin-1", { ...validBody, companyId: "INJECTED-COMPANY" }));

    const savedRecord = (repository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedRecord.companyId).toBe("COMP-1");
  });
});

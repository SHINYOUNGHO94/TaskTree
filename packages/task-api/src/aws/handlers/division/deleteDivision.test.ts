import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { createHandler } from "./deleteDivision";

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
  divisionId: "NONE",
  departmentId: "NONE",
  teamId: "NONE",
  role: UserRole.COMPANY_ADMIN,
};

const mockDivision = {
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "第一事業部",
};

describe("deleteDivision", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findById: vi.fn(), deleteById: vi.fn() } as unknown as DivisionRepository;
    const deptRepo = { findByDivisionId: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithoutAuth("DIV-1"));

    expect(response.statusCode).toBe(401);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN 以外のロールでは 403 を返す", async () => {
    const repository = { findById: vi.fn(), deleteById: vi.fn() } as unknown as DivisionRepository;
    const deptRepo = { findByDivisionId: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.DIVISION_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("div-admin", "DIV-1"));

    expect(response.statusCode).toBe(403);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("存在しない事業部は 404 を返す", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn(),
    } as unknown as DivisionRepository;
    const deptRepo = { findByDivisionId: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-NONEXISTENT"));

    expect(response.statusCode).toBe(404);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("部署が存在する場合は 400 を返す", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(mockDivision),
      deleteById: vi.fn(),
    } as unknown as DivisionRepository;
    const deptRepo = {
      findByDivisionId: vi.fn().mockResolvedValue([{ departmentId: "DEPT-1" }]),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDivisionId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1"));

    expect(response.statusCode).toBe(400);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("所属ユーザーが存在する場合は 400 を返す", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(mockDivision),
      deleteById: vi.fn(),
    } as unknown as DivisionRepository;
    const deptRepo = {
      findByDivisionId: vi.fn().mockResolvedValue([]),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDivisionId: vi.fn().mockResolvedValue(true),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1"));

    expect(response.statusCode).toBe(400);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は空の事業部を正常に削除できる", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(mockDivision),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const deptRepo = {
      findByDivisionId: vi.fn().mockResolvedValue([]),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDivisionId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1"));

    expect(response.statusCode).toBe(200);
    expect(repository.deleteById).toHaveBeenCalledWith("COMP-1", "DIV-1");
  });

  it("他社に部署があっても同会社配下に部署がなければ削除できる", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(mockDivision),
      deleteById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const deptRepo = {
      // companyId フィルタ済みで 0 件 (他社の部署は除外されている)
      findByDivisionId: vi.fn().mockResolvedValue([]),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      hasUsersByDivisionId: vi.fn().mockResolvedValue(false),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1"));

    expect(response.statusCode).toBe(200);
    expect(deptRepo.findByDivisionId).toHaveBeenCalledWith("DIV-1", "COMP-1");
    expect(repository.deleteById).toHaveBeenCalled();
  });

  it("tenant 分離: findById が undefined を返す場合は 404", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(undefined),
      deleteById: vi.fn(),
    } as unknown as DivisionRepository;
    const deptRepo = { findByDivisionId: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-OTHER-COMPANY"));

    expect(response.statusCode).toBe(404);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});

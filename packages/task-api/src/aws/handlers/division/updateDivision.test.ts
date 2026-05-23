import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { createHandler } from "./updateDivision";

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

const validBody = { name: "新しい事業部名" };

describe("updateDivision", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { findById: vi.fn(), update: vi.fn() } as unknown as DivisionRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithoutAuth("DIV-1", validBody));

    expect(response.statusCode).toBe(401);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("プロフィールが存在しない場合は 403 を返す", async () => {
    const repository = { findById: vi.fn(), update: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN 以外のロールでは 403 を返す", async () => {
    const repository = { findById: vi.fn(), update: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.DIVISION_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("存在しない事業部を更新しようとすると 404 を返す", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-NONEXISTENT", validBody));

    expect(response.statusCode).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("不正な JSON は 400 を返す", async () => {
    const repository = { findById: vi.fn(), update: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const event = {
      requestContext: { authorizer: { claims: { sub: "admin-1" } } },
      pathParameters: { id: "DIV-1" },
      body: "{ invalid json",
    } as unknown as APIGatewayProxyEvent;
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("name が空の場合は 400 を返す", async () => {
    const repository = { findById: vi.fn(), update: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1", { name: "" }));

    expect(response.statusCode).toBe(400);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は事業部を正常に更新できる", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(mockDivision),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-1", validBody));

    expect(response.statusCode).toBe(200);
    expect(repository.update).toHaveBeenCalledWith("COMP-1", "DIV-1", "新しい事業部名");
  });

  it("他の会社の事業部 (findById が undefined を返す場合) は 404 を返す", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", "DIV-OTHER-COMPANY", validBody));

    expect(response.statusCode).toBe(404);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

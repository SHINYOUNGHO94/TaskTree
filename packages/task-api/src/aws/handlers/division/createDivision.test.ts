import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { createHandler } from "./createDivision";

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
  divisionId: "NONE",
  departmentId: "NONE",
  teamId: "NONE",
  role: UserRole.COMPANY_ADMIN,
};

const validBody = { divisionId: "DIV-NEW", name: "新事業部" };

describe("createDivision", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DivisionRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithoutAuth(validBody));

    expect(response.statusCode).toBe(401);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("プロフィールが存在しない場合は 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN 以外のロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.DIVISION_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("USER ロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("必須フィールドが不足している場合は 400 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", { divisionId: "DIV-NEW" }));

    expect(response.statusCode).toBe(400);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は事業部を正常に作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBody));

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("クライアントから companyId を渡しても、サーバー側の companyId が使用される", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, userRepo });
    await handler(eventWithAuth("admin-1", { ...validBody, companyId: "INJECTED-COMPANY" }));

    const savedRecord = (repository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedRecord.companyId).toBe("COMP-1");
  });
});

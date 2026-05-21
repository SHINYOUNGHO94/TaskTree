import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getCases";

const eventWithAuth = (sub: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const mockProfile = {
  User: "user-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "user@example.com",
  role: UserRole.TEAM_ADMIN,
  name: "Test User",
  pk: "User",
  sk: "Team#TEAM-1#User#user-1",
  at: "2026-01-01T00:00:00.000Z",
};

const mockCase = {
  caseId: "CASE-1",
  title: "Test Case",
  description: "Test description",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.DIRECT,
  ownerType: CaseOwnerType.USER,
  ownerId: "user-1",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  creatorId: "user-1",
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const parseBody = <T>(body: string) => JSON.parse(body) as T;

describe("getCases", () => {
  it("JWT がない場合は 401", async () => {
    const caseRepo = { findByUser: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithoutAuth());
    expect(response.statusCode).toBe(401);
    expect(caseRepo.findByUser).not.toHaveBeenCalled();
  });

  it("user profile が存在しない場合は 500", async () => {
    const caseRepo = { findByUser: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1"));
    expect(response.statusCode).toBe(500);
    expect(caseRepo.findByUser).not.toHaveBeenCalled();
  });

  it("正常リクエストでは 200 と case 一覧を返す", async () => {
    const caseRepo = {
      findByUser: vi.fn().mockResolvedValue([mockCase]),
    } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1"));
    const body = parseBody<typeof mockCase[]>(response.body);
    expect(response.statusCode).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].caseId).toBe("CASE-1");
    expect(caseRepo.findByUser).toHaveBeenCalledWith({
      companyId: "COMP-1",
      divisionId: "DIV-1",
      departmentId: "DEPT-1",
      teamId: "TEAM-1",
      userId: "user-1",
      userRoleRank: 3,
    });
  });

  it("case が 0 件の場合は 200 と空配列を返す", async () => {
    const caseRepo = {
      findByUser: vi.fn().mockResolvedValue([]),
    } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1"));
    const body = parseBody<typeof mockCase[]>(response.body);
    expect(response.statusCode).toBe(200);
    expect(body).toHaveLength(0);
  });

  it("クライアントが提供する userId は無視してトークンの sub を使用する", async () => {
    const caseRepo = {
      findByUser: vi.fn().mockResolvedValue([]),
    } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    await handler(eventWithAuth("user-1"));
    expect(userRepo.findByUserId).toHaveBeenCalledWith("user-1");
  });
});

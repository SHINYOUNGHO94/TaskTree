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
import { createHandler } from "./getCase";

const eventWithAuth = (sub: string, id?: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: id ? { id } : null,
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    pathParameters: { id: "CASE-1" },
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

const baseCase = {
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

describe("getCase", () => {
  it("JWT がない場合は 401", async () => {
    const caseRepo = { findById: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithoutAuth());
    expect(response.statusCode).toBe(401);
    expect(caseRepo.findById).not.toHaveBeenCalled();
  });

  it("path parameter がない場合は 404", async () => {
    const caseRepo = { findById: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", undefined));
    expect(response.statusCode).toBe(404);
  });

  it("user profile が存在しない場合は 500", async () => {
    const caseRepo = { findById: vi.fn().mockResolvedValue(baseCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(undefined) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const caseRepo = { findById: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-NONEXISTENT"));
    expect(response.statusCode).toBe(404);
  });

  it("creator でも owner でも target でもない場合は 403", async () => {
    const otherCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerId: "other-user",
      targetScope: CaseTargetScope.USER,
      targetScopeId: "other-user",
    };
    const caseRepo = { findById: vi.fn().mockResolvedValue(otherCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(403);
  });

  it("creator は 200 で case を取得できる", async () => {
    const creatorCase = { ...baseCase, creatorId: "user-1", ownerId: "other", targetScopeId: "other" };
    const caseRepo = { findById: vi.fn().mockResolvedValue(creatorCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(200);
    const body = parseBody<typeof baseCase>(response.body);
    expect(body.caseId).toBe("CASE-1");
  });

  it("USER owner は 200 で case を取得できる", async () => {
    const ownerCase = { ...baseCase, creatorId: "other", ownerType: CaseOwnerType.USER, ownerId: "user-1", targetScopeId: "other" };
    const caseRepo = { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(200);
  });

  it("USER target は 200 で case を取得できる", async () => {
    const targetCase = {
      ...baseCase,
      creatorId: "other",
      ownerId: "other",
      targetScope: CaseTargetScope.USER,
      targetScopeId: "user-1",
    };
    const caseRepo = { findById: vi.fn().mockResolvedValue(targetCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(200);
  });

  it("TEAM target は 200 で case を取得できる", async () => {
    const teamCase = {
      ...baseCase,
      creatorId: "other",
      ownerId: "other",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const caseRepo = { findById: vi.fn().mockResolvedValue(teamCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(200);
  });

  it("TEAM target で別チームの場合は 403", async () => {
    const otherTeamCase = {
      ...baseCase,
      creatorId: "other",
      ownerId: "other",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-OTHER",
    };
    const caseRepo = { findById: vi.fn().mockResolvedValue(otherTeamCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(403);
  });

  it("TEAM target が一致しても別会社の case は 403", async () => {
    const otherCompanyCase = {
      ...baseCase,
      companyId: "COMP-OTHER",
      creatorId: "other",
      ownerId: "other",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const caseRepo = { findById: vi.fn().mockResolvedValue(otherCompanyCase) } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(mockProfile) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", "CASE-1"));
    expect(response.statusCode).toBe(403);
  });
});

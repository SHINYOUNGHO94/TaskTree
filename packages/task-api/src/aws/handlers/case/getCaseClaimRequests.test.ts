import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseClaimRequestStatus,
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseClaimRequestRepository } from "@/repositories/caseClaimRequestRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getCaseClaimRequests";

const makeEvent = (params: { sub?: string; id?: string }): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub ? { authorizer: { claims: { sub: params.sub } } } : {},
    pathParameters: params.id ? { id: params.id } : null,
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const mockProfile = {
  pk: "User",
  sk: "Team#TEAM-1#User#user-1",
  at: "2026-01-01T00:00:00.000Z",
  User: "user-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "user@example.com",
  role: UserRole.TEAM_ADMIN,
  name: "Test User",
};

const baseCase = {
  caseId: "CASE-1",
  title: "Test Case",
  description: "Test description",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.OPEN,
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

const baseClaim = {
  claimRequestId: "CLAIM-1",
  caseId: "CASE-1",
  companyId: "COMP-1",
  requesterId: "requester-1",
  status: CaseClaimRequestStatus.PENDING,
  message: null,
  rejectReason: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  claimResults?: unknown[];
}) => {
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const claimRequestRepo = {
    findByCaseId: vi.fn().mockResolvedValue(overrides.claimResults ?? []),
  } as unknown as CaseClaimRequestRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, claimRequestRepo, userRepo };
};

describe("getCaseClaimRequests", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1" }));
    expect(response.statusCode).toBe(401);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT" }));
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("creator でも owner でもなく自分の claim もない場合は 403", async () => {
    const otherCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: otherCase,
      profileResult: mockProfile,
      claimResults: [],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("creator は claim requests を取得できる", async () => {
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResults: [baseClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown[];
    expect(body).toHaveLength(1);
  });

  it("USER owner は claim requests を取得できる", async () => {
    const ownerCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "user-1",
    };
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
      claimResults: [baseClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("自分の claim がある場合は取得できる", async () => {
    const otherCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const ownClaim = { ...baseClaim, requesterId: "user-1" };
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: otherCase,
      profileResult: mockProfile,
      claimResults: [ownClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("自分の claim がある場合でも他人の claim は返さない", async () => {
    const otherCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const ownClaim = { ...baseClaim, requesterId: "user-1" };
    const otherClaim = {
      ...baseClaim,
      claimRequestId: "CLAIM-2",
      requesterId: "requester-2",
      message: "Other request",
    };
    const { caseRepo, claimRequestRepo, userRepo } = makeMockRepos({
      caseResult: otherCase,
      profileResult: mockProfile,
      claimResults: [ownClaim, otherClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as Array<{ requesterId: string }>;
    expect(body).toHaveLength(1);
    expect(body[0].requesterId).toBe("user-1");
  });
});

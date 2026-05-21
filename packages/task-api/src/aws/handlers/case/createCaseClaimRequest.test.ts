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
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./createCaseClaimRequest";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub ? { authorizer: { claims: { sub: params.sub } } } : {},
    pathParameters: params.id ? { id: params.id } : null,
    body:
      params.rawBody !== undefined
        ? params.rawBody
        : params.body !== undefined
          ? JSON.stringify(params.body)
          : null,
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
  ownerId: "other-user",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  creatorId: "other-user",
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  claimResults?: unknown[];
  saveMock?: ReturnType<typeof vi.fn>;
}) => {
  const save = overrides.saveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const claimRequestRepo = {
    findByCaseId: vi.fn().mockResolvedValue(overrides.claimResults ?? []),
    save,
  } as unknown as CaseClaimRequestRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo };
};

describe("createCaseClaimRequest", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な JSON の場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("予期しない field がある場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { requesterId: "spoofed" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("message が空文字の場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { message: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT", body: {} }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(403);
  });

  it("DIRECT case に claim できない", async () => {
    const directCase = { ...baseCase, deliveryType: CaseDeliveryType.DIRECT };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: directCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(403);
  });

  it("アクセス権限がない場合は 403", async () => {
    const inaccessibleCase = {
      ...baseCase,
      targetScope: CaseTargetScope.USER,
      targetScopeId: "other-user",
    };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: inaccessibleCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(403);
  });

  it("creator は自分の case に claim できない", async () => {
    const creatorCase = { ...baseCase, creatorId: "user-1" };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: creatorCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(403);
  });

  it("USER owner は自分の case に claim できない", async () => {
    const ownerCase = { ...baseCase, ownerType: CaseOwnerType.USER, ownerId: "user-1" };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(403);
  });

  it("既存の PENDING claim がある場合は 400", async () => {
    const pendingClaim = {
      claimRequestId: "CLAIM-1",
      caseId: "CASE-1",
      companyId: "COMP-1",
      requesterId: "user-1",
      status: CaseClaimRequestStatus.PENDING,
      message: null,
      rejectReason: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResults: [pendingClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(400);
  });

  it("claim request を正常に作成できる", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResults: [],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { message: "I want to work on this" } }),
    );
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { claimRequestId: string };
    expect(typeof body.claimRequestId).toBe("string");
    expect(claimRequestRepo.save).toHaveBeenCalledOnce();
  });

  it("message なしで claim request を作成できる", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResults: [],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(201);
    const savedArg = (claimRequestRepo.save as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      message: string | null;
      requesterId: string;
      status: string;
    };
    expect(savedArg.message).toBeNull();
    expect(savedArg.requesterId).toBe("user-1");
    expect(savedArg.status).toBe("PENDING");
  });
});

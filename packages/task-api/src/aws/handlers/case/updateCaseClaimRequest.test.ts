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
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./updateCaseClaimRequest";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  claimRequestId?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub ? { authorizer: { claims: { sub: params.sub } } } : {},
    pathParameters:
      params.id || params.claimRequestId
        ? {
            ...(params.id ? { id: params.id } : {}),
            ...(params.claimRequestId ? { claimRequestId: params.claimRequestId } : {}),
          }
        : null,
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
  claimResult?: unknown;
  allClaimsResult?: unknown[];
  caseSaveMock?: ReturnType<typeof vi.fn>;
  claimSaveMock?: ReturnType<typeof vi.fn>;
  approveWithCaseUpdateMock?: ReturnType<typeof vi.fn>;
}) => {
  const claimSave = overrides.claimSaveMock ?? vi.fn().mockResolvedValue(undefined);
  const approveWithCaseUpdate =
    overrides.approveWithCaseUpdateMock ?? vi.fn().mockResolvedValue(undefined);
  const caseSave = overrides.caseSaveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
    save: caseSave,
  } as unknown as CaseRepository;
  const claimRequestRepo = {
    findById: vi.fn().mockResolvedValue(overrides.claimResult),
    findByCaseId: vi.fn().mockResolvedValue(overrides.allClaimsResult ?? []),
    save: claimSave,
    approveWithCaseUpdate,
  } as unknown as CaseClaimRequestRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const assignmentRepo = {
    save: vi.fn().mockResolvedValue(undefined),
    deleteForOwner: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseAssignmentRepository;
  const visibilityRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseVisibilityRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo };
};

describe("updateCaseClaimRequest", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({ id: "CASE-1", claimRequestId: "CLAIM-1", body: { status: "APPROVED" } }),
    );
    expect(response.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", claimRequestId: "CLAIM-1" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("不正な JSON の場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", claimRequestId: "CLAIM-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("予期しない field がある場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED", extra: "field" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("status が無効な場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "PENDING" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("REJECTED で rejectReason がない場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "REJECTED" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("APPROVED で rejectReason がある場合は 400", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED", rejectReason: "should not be here" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
      claimResult: baseClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
      claimResult: baseClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-NONEXISTENT",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("claim request が存在しない場合は 404", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResult: undefined,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-NONEXISTENT",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("creator でも USER owner でもない場合は 403", async () => {
    const restrictedCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: restrictedCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("PENDING でない claim は更新できない", async () => {
    const approvedClaim = { ...baseClaim, status: CaseClaimRequestStatus.APPROVED };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResult: approvedClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("APPROVED により claim が承認されて case owner が変わる", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
      allClaimsResult: [baseClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { claimRequestId: string };
    expect(body.claimRequestId).toBe("CLAIM-1");
    expect(caseRepo.save).not.toHaveBeenCalled();
    expect(claimRequestRepo.approveWithCaseUpdate).toHaveBeenCalledOnce();
    const savedCase = (claimRequestRepo.approveWithCaseUpdate as ReturnType<typeof vi.fn>).mock
      .calls[0][0].updatedCase as {
      ownerId: string;
      status: string;
    };
    expect(savedCase.ownerId).toBe("requester-1");
    expect(savedCase.status).toBe(CaseStatus.IN_PROGRESS);
  });

  it("APPROVED により WAITING case は IN_PROGRESS になる", async () => {
    const waitingCase = { ...baseCase, status: CaseStatus.WAITING };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: waitingCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
      allClaimsResult: [baseClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    const savedCase = (claimRequestRepo.approveWithCaseUpdate as ReturnType<typeof vi.fn>).mock
      .calls[0][0].updatedCase as {
      status: string;
    };
    expect(savedCase.status).toBe(CaseStatus.IN_PROGRESS);
  });

  it("APPROVED により他の PENDING claim が REJECTED になる", async () => {
    const otherClaim = {
      ...baseClaim,
      claimRequestId: "CLAIM-2",
      requesterId: "requester-2",
    };
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
      allClaimsResult: [baseClaim, otherClaim],
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "APPROVED" },
      }),
    );
    const rejectedClaims = (claimRequestRepo.approveWithCaseUpdate as ReturnType<typeof vi.fn>)
      .mock.calls[0][0].rejectedClaimRequests as Array<{ claimRequestId: string; status: string }>;
    expect(rejectedClaims.some((c) => c.claimRequestId === "CLAIM-2")).toBe(true);
  });

  it("REJECTED により claim が拒否される", async () => {
    const { caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      claimResult: baseClaim,
    });
    const handler = createHandler({ caseRepo, claimRequestRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        claimRequestId: "CLAIM-1",
        body: { status: "REJECTED", rejectReason: "Not qualified" },
      }),
    );
    expect(response.statusCode).toBe(200);
    expect(caseRepo.save).not.toHaveBeenCalled();
    const savedClaim = (claimRequestRepo.save as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { status: string; rejectReason: string };
    expect(savedClaim.status).toBe(CaseClaimRequestStatus.REJECTED);
    expect(savedClaim.rejectReason).toBe("Not qualified");
  });
});

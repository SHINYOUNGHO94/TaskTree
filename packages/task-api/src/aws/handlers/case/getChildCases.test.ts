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
import { createHandler } from "./getChildCases";

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
  title: "Parent STANDARD Case",
  description: "Parent description",
  caseType: CaseType.STANDARD,
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

const childCase = {
  caseId: "CASE-CHILD-1",
  title: "Child REQUEST Case",
  description: "Child description",
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
  parentCaseId: "CASE-1",
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  childrenResult?: unknown[];
}) => {
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
    findChildrenByParentCaseId: vi.fn().mockResolvedValue(overrides.childrenResult ?? []),
  } as unknown as CaseRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, userRepo };
};

describe("getChildCases", () => {
  it("returns 401 when JWT is missing", async () => {
    const { caseRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1" }));
    expect(response.statusCode).toBe(401);
  });

  it("returns 500 when user profile is not found", async () => {
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(500);
  });

  it("returns 404 when case does not exist", async () => {
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT" }));
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 for case from another company", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when caller has no access to the case", async () => {
    const restrictedCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
      targetScope: CaseTargetScope.USER,
      targetScopeId: "other-user",
    };
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: restrictedCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 200 with children for creator", async () => {
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      childrenResult: [childCase],
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown[];
    expect(body).toHaveLength(1);
  });

  it("returns 200 with children for USER owner", async () => {
    const ownerCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "user-1",
    };
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
      childrenResult: [childCase],
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("returns 200 for caller targeted directly by USER scope", async () => {
    const userTargetCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
      targetScope: CaseTargetScope.USER,
      targetScopeId: "user-1",
    };
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: userTargetCase,
      profileResult: mockProfile,
      childrenResult: [],
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("returns 200 for caller whose team is targeted", async () => {
    const teamTargetCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: teamTargetCase,
      profileResult: mockProfile,
      childrenResult: [],
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("returns empty array when no children exist", async () => {
    const { caseRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      childrenResult: [],
    });
    const handler = createHandler({ caseRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown[];
    expect(body).toHaveLength(0);
  });
});

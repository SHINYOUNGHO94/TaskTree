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
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./createChildCase";

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

const targetUserProfile = {
  ...mockProfile,
  User: "target-user",
  email: "target@example.com",
  name: "Target User",
};

const standardCase = {
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

const validBody = {
  title: "Child Request Case",
  description: "Child description",
  deliveryType: "DIRECT",
  targetScope: "TEAM",
  targetScopeId: "TEAM-1",
  requiredRole: "USER",
  dueDate: null,
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  targetUserResult?: unknown;
  caseSaveMock?: ReturnType<typeof vi.fn>;
}) => {
  const caseSave = overrides.caseSaveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
    save: caseSave,
  } as unknown as CaseRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const userRepo = {
    findByUserId: vi.fn().mockImplementation((id: string) => {
      if (id === "user-1") return Promise.resolve(overrides.profileResult);
      return Promise.resolve(overrides.targetUserResult);
    }),
  } as unknown as UserRepository;
  return { caseRepo, caseHistoryRepo, userRepo };
};

describe("createChildCase", () => {
  it("returns 401 when JWT is missing", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when body is missing", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }));
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for unexpected fields", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, extra: "field" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when title is empty", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, title: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when description is empty", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, description: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid deliveryType", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, deliveryType: "INVALID" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid targetScope", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "COMPANY" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid requiredRole", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, requiredRole: "COMPANY_ADMIN" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when dueDate has invalid type", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, dueDate: 123 } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 500 when user profile is not found", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(500);
  });

  it("returns 404 when parent case does not exist", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT", body: validBody }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 for case from another company", async () => {
    const otherCompanyCase = { ...standardCase, companyId: "COMP-OTHER" };
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 400 when parent case is REQUEST (cannot create child under REQUEST)", async () => {
    const requestCase = { ...standardCase, caseType: CaseType.REQUEST };
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: requestCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(400);
  });

  it("returns 201 when parent case is PROJECT and creates STANDARD child", async () => {
    const projectCase = {
      ...standardCase,
      caseId: "PROJECT-1",
      caseType: CaseType.PROJECT,
      projectId: null,
      parentCaseId: null,
    };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: projectCase,
      profileResult: mockProfile,
      caseSaveMock,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "PROJECT-1", body: validBody }));
    expect(response.statusCode).toBe(201);
    const savedCase = caseSaveMock.mock.calls[0][0] as {
      caseType: string;
      projectId: string;
      parentCaseId: string;
    };
    expect(savedCase.caseType).toBe(CaseType.STANDARD);
    expect(savedCase.projectId).toBe("PROJECT-1");
    expect(savedCase.parentCaseId).toBe("PROJECT-1");
  });

  it("REQUEST child under STANDARD inherits projectId from STANDARD parent", async () => {
    const standardWithProject = { ...standardCase, projectId: "PROJECT-1" };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardWithProject,
      profileResult: mockProfile,
      caseSaveMock,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    const savedCase = caseSaveMock.mock.calls[0][0] as {
      caseType: string;
      projectId: string;
    };
    expect(savedCase.caseType).toBe(CaseType.REQUEST);
    expect(savedCase.projectId).toBe("PROJECT-1");
  });

  it("returns 403 when caller is neither creator nor USER owner", async () => {
    const restrictedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: restrictedCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when TEAM scope does not use caller team id", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "TEAM", targetScopeId: "TEAM-OTHER" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 with caseId on successful creation by creator", async () => {
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      caseSaveMock,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { caseId: string };
    expect(typeof body.caseId).toBe("string");
    expect(caseSaveMock).toHaveBeenCalledOnce();
  });

  it("returns 201 when caller is USER owner (not creator)", async () => {
    const ownerCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "user-1",
    };
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("saves child case with REQUEST type and correct parentCaseId", async () => {
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      caseSaveMock,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    const savedCase = caseSaveMock.mock.calls[0][0] as {
      caseType: string;
      parentCaseId: string;
      status: string;
    };
    expect(savedCase.caseType).toBe(CaseType.REQUEST);
    expect(savedCase.parentCaseId).toBe("CASE-1");
    expect(savedCase.status).toBe(CaseStatus.WAITING);
  });

  it("inherits projectId from parent case", async () => {
    const parentWithProject = { ...standardCase, projectId: "PROJ-1" };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: parentWithProject,
      profileResult: mockProfile,
      caseSaveMock,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    const savedCase = caseSaveMock.mock.calls[0][0] as { projectId: string };
    expect(savedCase.projectId).toBe("PROJ-1");
  });

  it("returns 404 when USER scope target user does not exist", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      targetUserResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 when USER scope target user belongs to another company", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      targetUserResult: { ...targetUserProfile, companyId: "COMP-OTHER" },
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when USER scope target user is outside caller team", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      targetUserResult: { ...targetUserProfile, teamId: "TEAM-OTHER" },
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 for USER scope target within caller team", async () => {
    const { caseRepo, caseHistoryRepo, userRepo } = makeMockRepos({
      caseResult: standardCase,
      profileResult: mockProfile,
      targetUserResult: targetUserProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });
});

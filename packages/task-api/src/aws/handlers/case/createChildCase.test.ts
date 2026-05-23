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
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
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

const defaultTeam = {
  teamId: "TEAM-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  companyId: "COMP-1",
};

const defaultDivision = { divisionId: "DIV-1", companyId: "COMP-1" };

const defaultDepartment = {
  departmentId: "DEPT-1",
  divisionId: "DIV-1",
  companyId: "COMP-1",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  targetUserResult?: unknown;
  caseSaveMock?: ReturnType<typeof vi.fn>;
  teamsResult?: unknown[];
  divisionsResult?: unknown[];
  divisionFindByIdResult?: unknown;
  departmentsResult?: unknown[];
}) => {
  const caseSave = overrides.caseSaveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
    save: caseSave,
  } as unknown as CaseRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const assignmentRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseAssignmentRepository;
  const visibilityRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseVisibilityRepository;
  const userRepo = {
    findByUserId: vi.fn().mockImplementation((id: string) => {
      if (id === "user-1") return Promise.resolve(overrides.profileResult);
      return Promise.resolve(overrides.targetUserResult);
    }),
  } as unknown as UserRepository;
  const divisionRepo = {
    findById: vi.fn().mockResolvedValue(
      "divisionFindByIdResult" in overrides
        ? overrides.divisionFindByIdResult
        : defaultDivision,
    ),
    findByCompanyId: vi.fn().mockResolvedValue(
      overrides.divisionsResult ?? [defaultDivision],
    ),
  } as unknown as DivisionRepository;
  const deptRepo = {
    findByCompanyId: vi.fn().mockResolvedValue(
      overrides.departmentsResult ?? [defaultDepartment],
    ),
  } as unknown as DepartmentRepository;
  const teamRepo = {
    findByCompanyId: vi.fn().mockResolvedValue(
      overrides.teamsResult ?? [defaultTeam],
    ),
  } as unknown as TeamRepository;
  return {
    caseRepo,
    caseHistoryRepo,
    assignmentRepo,
    visibilityRepo,
    userRepo,
    divisionRepo,
    deptRepo,
    teamRepo,
  };
};

describe("createChildCase", () => {
  it("returns 401 when JWT is missing", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(makeEvent({ id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when body is missing", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for unexpected fields", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, extra: "field" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when title is empty", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, title: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when description is empty", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, description: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid deliveryType", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, deliveryType: "INVALID" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for unknown targetScope value", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "INVALID" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid requiredRole string", async () => {
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, requiredRole: "NOT_A_ROLE" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 for invalid requiredRole (COMPANY_ADMIN exceeds TEAM_ADMIN caller)", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile }),
    );
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
    const handler = createHandler(makeMockRepos({}));
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { ...validBody, dueDate: 123 } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 500 when user profile is not found", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: undefined }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(500);
  });

  it("returns 404 when parent case does not exist", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: undefined, profileResult: mockProfile }),
    );
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT", body: validBody }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 for case from another company", async () => {
    const otherCompanyCase = { ...standardCase, companyId: "COMP-OTHER" };
    const handler = createHandler(
      makeMockRepos({ caseResult: otherCompanyCase, profileResult: mockProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 400 when parent case is REQUEST (cannot create child under REQUEST)", async () => {
    const requestCase = { ...standardCase, caseType: CaseType.REQUEST };
    const handler = createHandler(
      makeMockRepos({ caseResult: requestCase, profileResult: mockProfile }),
    );
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
    const handler = createHandler(
      makeMockRepos({ caseResult: projectCase, profileResult: mockProfile, caseSaveMock }),
    );
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
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardWithProject,
        profileResult: mockProfile,
        caseSaveMock,
      }),
    );
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
    const handler = createHandler(
      makeMockRepos({ caseResult: restrictedCase, profileResult: mockProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 404 when TEAM scope targetScopeId not found in company", async () => {
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        teamsResult: [],
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "TEAM", targetScopeId: "TEAM-OTHER" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 when TEAM_ADMIN targets a team outside their own team", async () => {
    const otherTeam = { teamId: "TEAM-OTHER", divisionId: "DIV-1", departmentId: "DEPT-1", companyId: "COMP-1" };
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        teamsResult: [otherTeam],
      }),
    );
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
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile, caseSaveMock }),
    );
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
    const handler = createHandler(
      makeMockRepos({ caseResult: ownerCase, profileResult: mockProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("saves child case with REQUEST type and correct parentCaseId", async () => {
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile, caseSaveMock }),
    );
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
    const handler = createHandler(
      makeMockRepos({
        caseResult: parentWithProject,
        profileResult: mockProfile,
        caseSaveMock,
      }),
    );
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    const savedCase = caseSaveMock.mock.calls[0][0] as { projectId: string };
    expect(savedCase.projectId).toBe("PROJ-1");
  });

  it("returns 404 when USER scope target user does not exist", async () => {
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        targetUserResult: undefined,
      }),
    );
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
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        targetUserResult: { ...targetUserProfile, companyId: "COMP-OTHER" },
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when TEAM_ADMIN targets USER outside their team", async () => {
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        targetUserResult: { ...targetUserProfile, teamId: "TEAM-OTHER" },
      }),
    );
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
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        targetUserResult: targetUserProfile,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "USER", targetScopeId: "target-user" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 400 when targetScope is USER and deliveryType is OPEN", async () => {
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: mockProfile,
        targetUserResult: targetUserProfile,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: {
          ...validBody,
          targetScope: "USER",
          targetScopeId: "target-user",
          deliveryType: "OPEN",
        },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when requiredRole exceeds caller role (DEPT_ADMIN for TEAM_ADMIN caller)", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, requiredRole: "DEPT_ADMIN" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("returns 201 when caller is TEAM_ADMIN and case ownerType is TEAM (same team)", async () => {
    const teamOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.TEAM,
      ownerId: "TEAM-1",
    };
    const handler = createHandler(
      makeMockRepos({ caseResult: teamOwnedCase, profileResult: mockProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when caller is TEAM_ADMIN but case ownerType is TEAM (different team)", async () => {
    const teamOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.TEAM,
      ownerId: "TEAM-OTHER",
      teamId: "TEAM-OTHER",
    };
    const handler = createHandler(
      makeMockRepos({ caseResult: teamOwnedCase, profileResult: mockProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 when caller is DEPT_ADMIN and case ownerType is DEPARTMENT (same dept)", async () => {
    const deptOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.DEPARTMENT,
      ownerId: "DEPT-1",
    };
    const deptAdminProfile = { ...mockProfile, role: UserRole.DEPT_ADMIN };
    const handler = createHandler(
      makeMockRepos({ caseResult: deptOwnedCase, profileResult: deptAdminProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("returns 201 when caller is DIVISION_ADMIN and case ownerType is DIVISION (same division)", async () => {
    const divisionOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.DIVISION,
      ownerId: "DIV-1",
    };
    const divisionAdminProfile = { ...mockProfile, role: UserRole.DIVISION_ADMIN };
    const handler = createHandler(
      makeMockRepos({ caseResult: divisionOwnedCase, profileResult: divisionAdminProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("returns 201 when caller is COMPANY_ADMIN and case ownerType is COMPANY", async () => {
    const companyOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.COMPANY,
      ownerId: "COMP-1",
    };
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const handler = createHandler(
      makeMockRepos({ caseResult: companyOwnedCase, profileResult: companyAdminProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when COMPANY_ADMIN is neither creator nor USER owner of a USER-owned parent case", async () => {
    const userOwnedCase = {
      ...standardCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "other-user",
    };
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const handler = createHandler(
      makeMockRepos({ caseResult: userOwnedCase, profileResult: companyAdminProfile }),
    );
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: validBody }));
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 when COMPANY_ADMIN sets requiredRole to COMPANY_ADMIN", async () => {
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const companyOwnedCase = {
      ...standardCase,
      ownerType: CaseOwnerType.COMPANY,
      ownerId: "COMP-1",
    };
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const handler = createHandler(
      makeMockRepos({
        caseResult: companyOwnedCase,
        profileResult: companyAdminProfile,
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, requiredRole: "COMPANY_ADMIN" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when TEAM_ADMIN tries DIVISION targetScope (not allowed by role)", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DIVISION", targetScopeId: "DIV-1" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when TEAM_ADMIN tries COMPANY targetScope (not allowed by role)", async () => {
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: mockProfile }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "COMPANY", targetScopeId: "COMP-1" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 when COMPANY_ADMIN targets COMPANY scope with own companyId", async () => {
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: companyAdminProfile,
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "COMPANY", targetScopeId: "COMP-1" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when COMPANY_ADMIN targets COMPANY scope with wrong companyId", async () => {
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const handler = createHandler(
      makeMockRepos({ caseResult: standardCase, profileResult: companyAdminProfile }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "COMPANY", targetScopeId: "COMP-OTHER" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 when COMPANY_ADMIN targets DIVISION scope", async () => {
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: companyAdminProfile,
        divisionFindByIdResult: defaultDivision,
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DIVISION", targetScopeId: "DIV-1" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 201 when DIVISION_ADMIN targets their own DIVISION scope", async () => {
    const divisionAdminProfile = { ...mockProfile, role: UserRole.DIVISION_ADMIN };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: divisionAdminProfile,
        divisionFindByIdResult: defaultDivision,
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DIVISION", targetScopeId: "DIV-1" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when DIVISION_ADMIN targets a different DIVISION scope", async () => {
    const divisionAdminProfile = { ...mockProfile, role: UserRole.DIVISION_ADMIN };
    const otherDivision = { divisionId: "DIV-OTHER", companyId: "COMP-1" };
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: divisionAdminProfile,
        divisionFindByIdResult: otherDivision,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DIVISION", targetScopeId: "DIV-OTHER" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 404 when DIVISION targetScopeId does not exist", async () => {
    const divisionAdminProfile = { ...mockProfile, role: UserRole.DIVISION_ADMIN };
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: divisionAdminProfile,
        divisionFindByIdResult: undefined,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DIVISION", targetScopeId: "DIV-GONE" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("returns 201 when DEPT_ADMIN targets their own DEPARTMENT scope", async () => {
    const deptAdminProfile = { ...mockProfile, role: UserRole.DEPT_ADMIN };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: deptAdminProfile,
        departmentsResult: [defaultDepartment],
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DEPARTMENT", targetScopeId: "DEPT-1" },
      }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("returns 403 when DEPT_ADMIN targets a different DEPARTMENT scope", async () => {
    const deptAdminProfile = { ...mockProfile, role: UserRole.DEPT_ADMIN };
    const otherDept = { departmentId: "DEPT-OTHER", divisionId: "DIV-1", companyId: "COMP-1" };
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: deptAdminProfile,
        departmentsResult: [otherDept],
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { ...validBody, targetScope: "DEPARTMENT", targetScopeId: "DEPT-OTHER" },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 403 when USER/GUEST role targets a different user (not self)", async () => {
    const userRoleProfile = { ...mockProfile, role: UserRole.USER };
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: userRoleProfile,
        targetUserResult: { ...targetUserProfile, teamId: "TEAM-1" },
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: {
          ...validBody,
          targetScope: "USER",
          targetScopeId: "target-user",
          requiredRole: "USER",
        },
      }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("returns 201 when USER role targets themselves", async () => {
    const userRoleProfile = { ...mockProfile, role: UserRole.USER };
    const caseSaveMock = vi.fn().mockResolvedValue(undefined);
    const handler = createHandler(
      makeMockRepos({
        caseResult: standardCase,
        profileResult: userRoleProfile,
        targetUserResult: userRoleProfile,
        caseSaveMock,
      }),
    );
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: {
          ...validBody,
          targetScope: "USER",
          targetScopeId: "user-1",
          requiredRole: "USER",
        },
      }),
    );
    expect(response.statusCode).toBe(201);
  });
});

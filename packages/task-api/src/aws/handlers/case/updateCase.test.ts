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
import { createHandler } from "./updateCase";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub
      ? { authorizer: { claims: { sub: params.sub } } }
      : {},
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

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  saveMock?: ReturnType<typeof vi.fn>;
}) => {
  const save = overrides.saveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
    findChildrenByParentCaseId: vi.fn().mockResolvedValue([]),
    save,
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
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  const notifRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as import("@/repositories/notificationRepository").NotificationRepository;
  return { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo };
};

describe("updateCase", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な JSON の場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("status が存在しない場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: {} }));
    expect(response.statusCode).toBe(400);
  });

  it("status が無効な値の場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "INVALID_STATUS" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("許可されていない field が含まれる場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { unknownField: "value" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("title のみ更新できる", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "New title" } }),
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { caseId: string };
    expect(body.caseId).toBe("CASE-1");
  });

  it("title と description と dueDate を同時に更新できる", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { title: "Updated", description: "New desc", dueDate: "2026-12-31" },
      }),
    );
    expect(response.statusCode).toBe(200);
  });

  it("不正な dueDate 形式は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { dueDate: "abc" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("存在しない日付の dueDate は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { dueDate: "2026-99-99" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("月末を超える dueDate (2026-02-30) は 400", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { dueDate: "2026-02-30" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("dueDate を null にクリアできる", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: { ...baseCase, dueDate: "2026-01-01" },
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { dueDate: null } }),
    );
    expect(response.statusCode).toBe(200);
  });

  it("status と title を同時に更新できる", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { status: "IN_PROGRESS", title: "Updated title" },
      }),
    );
    expect(response.statusCode).toBe(200);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("USER ロールで creator でも owner でもない場合は 403", async () => {
    const restrictedCase = { ...baseCase, creatorId: "other-user", ownerId: "other-user" };
    const plainUserProfile = { ...mockProfile, role: UserRole.USER };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: restrictedCase,
      profileResult: plainUserProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("TEAM owner の case で USER ロール caller が creator でない場合は 403", async () => {
    const teamOwnerCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.TEAM,
      ownerId: "TEAM-1",
    };
    const plainUserProfile = { ...mockProfile, role: UserRole.USER };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: teamOwnerCase,
      profileResult: plainUserProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("creator は status を変更できる", async () => {
    const creatorCase = { ...baseCase, creatorId: "user-1", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: creatorCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { caseId: string };
    expect(body.caseId).toBe("CASE-1");
    expect(caseRepo.save).toHaveBeenCalledOnce();
  });

  it("USER owner は status を変更できる", async () => {
    const ownerCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "user-1",
    };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }),
    );
    expect(response.statusCode).toBe(200);
    expect(caseRepo.save).toHaveBeenCalledOnce();
  });

  it("COMPANY_ADMIN は同会社の case を編集できる", async () => {
    const companyAdminProfile = { ...mockProfile, role: UserRole.COMPANY_ADMIN, companyId: "COMP-1" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: companyAdminProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(200);
  });

  it("DIVISION_ADMIN は同 division の case を編集できる", async () => {
    const divAdminProfile = { ...mockProfile, role: UserRole.DIVISION_ADMIN, divisionId: "DIV-1" };
    const caseInDiv = { ...baseCase, creatorId: "other-user", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: caseInDiv,
      profileResult: divAdminProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(200);
  });

  it("DEPT_ADMIN は同 department の case を編集できる", async () => {
    const deptAdminProfile = { ...mockProfile, role: UserRole.DEPT_ADMIN, departmentId: "DEPT-1" };
    const caseInDept = { ...baseCase, creatorId: "other-user", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: caseInDept,
      profileResult: deptAdminProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(200);
  });

  it("TEAM_ADMIN は同 team の case を編集できる", async () => {
    const teamAdminProfile = { ...mockProfile, role: UserRole.TEAM_ADMIN, teamId: "TEAM-1" };
    const caseInTeam = { ...baseCase, creatorId: "other-user", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: caseInTeam,
      profileResult: teamAdminProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(200);
  });

  it("TEAM_ADMIN は別 team の case を編集できない", async () => {
    const otherTeamAdminProfile = { ...mockProfile, role: UserRole.TEAM_ADMIN, teamId: "TEAM-OTHER" };
    const caseInOtherTeam = { ...baseCase, teamId: "TEAM-1", creatorId: "other-user", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: caseInOtherTeam,
      profileResult: otherTeamAdminProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(403);
  });

  it("別会社の管理者は編集できない", async () => {
    const otherCompanyAdmin = { ...mockProfile, role: UserRole.COMPANY_ADMIN, companyId: "COMP-OTHER" };
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: otherCompanyAdmin,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "IN_PROGRESS" } }));
    expect(response.statusCode).toBe(403);
  });

  it("save 呼び出し時に新しい status と updatedAt が渡される", async () => {
    const { caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, assignmentRepo, visibilityRepo, notifRepo, userRepo });
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", body: { status: "COMPLETED" } }));
    const savedArg = (caseRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      status: string;
      updatedAt: string;
    };
    expect(savedArg.status).toBe("COMPLETED");
    expect(savedArg.updatedAt).not.toBe(baseCase.updatedAt);
  });
});

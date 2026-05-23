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
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./createCaseTask";

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
  } as unknown as CaseRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const caseTaskRepo = { save } as unknown as CaseTaskRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo };
};

describe("createCaseTask", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ id: "CASE-1", body: { title: "Task", description: "" } }),
    );
    expect(response.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な JSON の場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("title が空の場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "  ", description: "" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("description が文字列でない場合は 400", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task" } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "" } }),
    );
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-NONEXISTENT",
        body: { title: "Task", description: "" },
      }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("creator でも USER owner でもない場合は 403", async () => {
    const restrictedCase = { ...baseCase, creatorId: "other-user", ownerId: "other-user" };
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: restrictedCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("creator は task を作成できる", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "Desc" } }),
    );
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { taskId: string };
    expect(typeof body.taskId).toBe("string");
    expect(caseTaskRepo.save).toHaveBeenCalledOnce();
  });

  it("USER owner は task を作成できる", async () => {
    const ownerCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerType: CaseOwnerType.USER,
      ownerId: "user-1",
    };
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: ownerCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "" } }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("作成された task には TODO status と caseId が含まれる", async () => {
    const { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseHistoryRepo, caseTaskRepo, userRepo });
    await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { title: "Task", description: "Desc" } }),
    );
    const savedArg = (caseTaskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      status: string;
      caseId: string;
      companyId: string;
    };
    expect(savedArg.status).toBe("TODO");
    expect(savedArg.caseId).toBe("CASE-1");
    expect(savedArg.companyId).toBe("COMP-1");
  });
});

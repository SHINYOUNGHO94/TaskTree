import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseTaskStatus,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { CaseTaskRepository } from "@/repositories/caseTaskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./updateCaseTask";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  taskId?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub
      ? { authorizer: { claims: { sub: params.sub } } }
      : {},
    pathParameters: {
      ...(params.id ? { id: params.id } : {}),
      ...(params.taskId ? { taskId: params.taskId } : {}),
    },
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

const baseTask = {
  taskId: "TASK-1",
  caseId: "CASE-1",
  companyId: "COMP-1",
  creatorId: "user-1",
  assigneeId: null,
  title: "Test Task",
  description: "Task description",
  status: CaseTaskStatus.TODO,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  taskResult?: unknown;
  saveMock?: ReturnType<typeof vi.fn>;
}) => {
  const save = overrides.saveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const caseTaskRepo = {
    findById: vi.fn().mockResolvedValue(overrides.taskResult),
    save,
  } as unknown as CaseTaskRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo };
};

describe("updateCaseTask", () => {
  it("JWT がない場合は 401", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ id: "CASE-1", taskId: "TASK-1", body: { title: "New" } }));
    expect(res.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(400);
  });

  it("空 body (フィールドなし) は 400", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: {} }));
    expect(res.statusCode).toBe(400);
  });

  it("不正な JSON は 400", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", rawBody: "bad" }));
    expect(res.statusCode).toBe(400);
  });

  it("不正なフィールドは 400", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { hack: "x" } }));
    expect(res.statusCode).toBe(400);
  });

  it("user profile がない場合は 500", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: undefined });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { title: "T" } }));
    expect(res.statusCode).toBe(500);
  });

  it("case がない場合は 404", async () => {
    const repos = makeMockRepos({ caseResult: undefined, profileResult: mockProfile });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-NONE", taskId: "TASK-1", body: { title: "T" } }));
    expect(res.statusCode).toBe(404);
  });

  it("別会社は 403", async () => {
    const repos = makeMockRepos({ caseResult: { ...baseCase, companyId: "OTHER" }, profileResult: mockProfile });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { title: "T" } }));
    expect(res.statusCode).toBe(403);
  });

  it("task がない場合は 404", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: undefined });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-NONE", body: { title: "T" } }));
    expect(res.statusCode).toBe(404);
  });

  it("権限なし (creator でも owner でも task creator でも assignee でもない) は 403", async () => {
    const restrictedCase = { ...baseCase, creatorId: "other", ownerId: "other" };
    const restrictedTask = { ...baseTask, creatorId: "other", assigneeId: "other" };
    const repos = makeMockRepos({ caseResult: restrictedCase, profileResult: mockProfile, taskResult: restrictedTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { title: "T" } }));
    expect(res.statusCode).toBe(403);
  });

  it("case creator は task を更新できる", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: baseTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { title: "New Title" } }));
    expect(res.statusCode).toBe(200);
    expect(repos.caseTaskRepo.save).toHaveBeenCalledOnce();
    const saved = (repos.caseTaskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as { title: string };
    expect(saved.title).toBe("New Title");
  });

  it("task assignee は task を更新できる", async () => {
    const assignedTask = { ...baseTask, creatorId: "other", assigneeId: "user-1" };
    const otherCase = { ...baseCase, creatorId: "other", ownerId: "other" };
    const repos = makeMockRepos({ caseResult: otherCase, profileResult: mockProfile, taskResult: assignedTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { status: CaseTaskStatus.IN_PROGRESS } }));
    expect(res.statusCode).toBe(200);
  });

  it("status 変更は updatedAt を更新する", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: baseTask });
    const handler = createHandler(repos);
    await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { status: CaseTaskStatus.DONE } }));
    const saved = (repos.caseTaskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as { status: string; updatedAt: string };
    expect(saved.status).toBe(CaseTaskStatus.DONE);
    expect(saved.updatedAt).not.toBe(baseTask.updatedAt);
  });

  it("別会社の assigneeId は 400", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: baseTask });
    (repos.userRepo.findByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ ...mockProfile, User: "assignee-other", companyId: "OTHER" });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { assigneeId: "assignee-other" } }));
    expect(res.statusCode).toBe(400);
    expect(repos.caseTaskRepo.save).not.toHaveBeenCalled();
  });

  it("存在しない assigneeId は 400", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: baseTask });
    (repos.userRepo.findByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(undefined);
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { assigneeId: "missing-user" } }));
    expect(res.statusCode).toBe(400);
    expect(repos.caseTaskRepo.save).not.toHaveBeenCalled();
  });

  it("部署 owner の DEPT_ADMIN は task を更新できる", async () => {
    const deptOwnerCase = { ...baseCase, creatorId: "other", ownerType: CaseOwnerType.DEPARTMENT, ownerId: "DEPT-1" };
    const otherTask = { ...baseTask, creatorId: "other", assigneeId: "other" };
    const deptAdminProfile = { ...mockProfile, role: UserRole.DEPT_ADMIN };
    const repos = makeMockRepos({ caseResult: deptOwnerCase, profileResult: deptAdminProfile, taskResult: otherTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1", body: { title: "Dept update" } }));
    expect(res.statusCode).toBe(200);
  });
});

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
import { createHandler } from "./deleteCaseTask";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  taskId?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub
      ? { authorizer: { claims: { sub: params.sub } } }
      : {},
    pathParameters: {
      ...(params.id ? { id: params.id } : {}),
      ...(params.taskId ? { taskId: params.taskId } : {}),
    },
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
}) => {
  const removeMock = vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const caseHistoryRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as CaseHistoryRepository;
  const caseTaskRepo = {
    findById: vi.fn().mockResolvedValue(overrides.taskResult),
    remove: removeMock,
  } as unknown as CaseTaskRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, caseHistoryRepo, caseTaskRepo, userRepo };
};

describe("deleteCaseTask", () => {
  it("JWT がない場合は 401", async () => {
    const repos = makeMockRepos({});
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(401);
  });

  it("user profile がない場合は 500", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: undefined });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(500);
  });

  it("case がない場合は 404", async () => {
    const repos = makeMockRepos({ caseResult: undefined, profileResult: mockProfile });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-NONE", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(404);
  });

  it("別会社は 403", async () => {
    const repos = makeMockRepos({ caseResult: { ...baseCase, companyId: "OTHER" }, profileResult: mockProfile });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(403);
  });

  it("task がない場合は 404", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: undefined });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-NONE" }));
    expect(res.statusCode).toBe(404);
  });

  it("権限なしは 403", async () => {
    const restrictedCase = { ...baseCase, creatorId: "other", ownerId: "other" };
    const restrictedTask = { ...baseTask, creatorId: "other", assigneeId: "other" };
    const repos = makeMockRepos({ caseResult: restrictedCase, profileResult: mockProfile, taskResult: restrictedTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(403);
  });

  it("case creator は task を削除できる (204)", async () => {
    const repos = makeMockRepos({ caseResult: baseCase, profileResult: mockProfile, taskResult: baseTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(204);
    expect(repos.caseTaskRepo.remove).toHaveBeenCalledOnce();
  });

  it("task creator は task を削除できる", async () => {
    const otherCase = { ...baseCase, creatorId: "other", ownerId: "other" };
    const ownedTask = { ...baseTask, creatorId: "user-1", assigneeId: null };
    const repos = makeMockRepos({ caseResult: otherCase, profileResult: mockProfile, taskResult: ownedTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(204);
  });

  it("チーム owner の TEAM_ADMIN は task を削除できる", async () => {
    const teamOwnerCase = { ...baseCase, creatorId: "other", ownerType: CaseOwnerType.TEAM, ownerId: "TEAM-1" };
    const otherTask = { ...baseTask, creatorId: "other", assigneeId: "other" };
    const teamAdminProfile = { ...mockProfile, role: UserRole.TEAM_ADMIN };
    const repos = makeMockRepos({ caseResult: teamOwnerCase, profileResult: teamAdminProfile, taskResult: otherTask });
    const handler = createHandler(repos);
    const res = await handler(makeEvent({ sub: "user-1", id: "CASE-1", taskId: "TASK-1" }));
    expect(res.statusCode).toBe(204);
    expect(repos.caseTaskRepo.remove).toHaveBeenCalledOnce();
  });
});

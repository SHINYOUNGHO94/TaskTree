import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { AccessScope, TaskLevel, TaskStatus, UserRole } from "@task/core";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./updateTask";

const existingTask = {
  id: "task-1",
  title: "既存タスク",
  content: "既存の内容",
  status: TaskStatus.NOT_STARTED,
  level: TaskLevel.MEDIUM,
  limitDate: "2026-12-31",
  accessScope: AccessScope.TEAM,
  memberId: "member-1",
  creatorId: "creator-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const eventWithAuth = (sub: string, taskId: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: taskId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventWithRawBody = (sub: string, taskId: string, rawBody: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: taskId },
    body: rawBody,
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    pathParameters: { id: "task-1" },
    body: JSON.stringify({ title: "更新" }),
  }) as unknown as APIGatewayProxyEvent;

const parseBody = <T>(body: string) => JSON.parse(body) as T;

describe("updateTask", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const taskRepo = { findByTaskId: vi.fn(), save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(eventWithoutAuth());

    expect(response.statusCode).toBe(401);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("malformed JSON の場合は 400 を返す", async () => {
    const taskRepo = { findByTaskId: vi.fn(), save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(eventWithRawBody("member-1", "task-1", "{invalid json"));

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("不正な status 値の場合は 400 を返す", async () => {
    const taskRepo = { findByTaskId: vi.fn(), save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("member-1", "task-1", { status: "INVALID_STATUS" })
    );

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("不正な level 値の場合は 400 を返す", async () => {
    const taskRepo = { findByTaskId: vi.fn(), save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("member-1", "task-1", { level: "ULTRA" })
    );

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("タスクが存在しない場合は 404 を返す", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
    } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(eventWithAuth("member-1", "task-not-exist", { title: "更新" }));

    expect(response.statusCode).toBe(404);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("オーナーでも COMPANY_ADMIN でもない場合は 403 を返す", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn(),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(eventWithAuth("other-user", "task-1", { title: "不正更新" }));

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("オーナーは許可フィールドを更新できる", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("member-1", "task-1", { title: "新しいタイトル", status: TaskStatus.WORKING })
    );
    const body = parseBody<{ title: string; status: string }>(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.title).toBe("新しいタイトル");
    expect(body.status).toBe(TaskStatus.WORKING);
  });

  it("同一会社の COMPANY_ADMIN は他人のタスクを更新できる", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ role: UserRole.COMPANY_ADMIN, companyId: "COMP-1" }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("admin-user", "task-1", { title: "管理者による更新" })
    );

    expect(response.statusCode).toBe(200);
    expect(taskRepo.save).toHaveBeenCalledOnce();
  });

  it("別会社の COMPANY_ADMIN はタスクを更新できない", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn(),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ role: UserRole.COMPANY_ADMIN, companyId: "COMP-OTHER" }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("admin-other", "task-1", { title: "別会社管理者による不正更新" })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("id/creatorId/companyId/createdAt 等の不変フィールドはボディで上書きできない", async () => {
    const taskRepo = {
      findByTaskId: vi.fn().mockResolvedValue(existingTask),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo });
    const response = await handler(
      eventWithAuth("member-1", "task-1", {
        title: "更新タイトル",
        id: "INJECTED-ID",
        creatorId: "INJECTED-CREATOR",
        companyId: "INJECTED-COMPANY",
        createdAt: "1970-01-01T00:00:00.000Z",
      })
    );
    const body = parseBody<{
      id: string;
      creatorId: string;
      companyId: string;
      createdAt: string;
    }>(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.id).toBe("task-1");
    expect(body.creatorId).toBe("creator-1");
    expect(body.companyId).toBe("COMP-1");
    expect(body.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

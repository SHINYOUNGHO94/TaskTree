import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { AccessScope, TaskLevel, TaskStatus, UserRole } from "@task/core";
import { TaskRepository } from "@/repositories/taskRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./createTask";

const eventWithAuth = (sub: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventNoBody = (): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub: "creator-1" } } },
    body: null,
  }) as unknown as APIGatewayProxyEvent;

// status はサーバーで NOT_STARTED に固定のため、送信しない
const validBody = {
  title: "テストタスク",
  content: "タスクの内容",
  level: TaskLevel.MEDIUM,
  limitDate: "2026-12-31",
  accessScope: AccessScope.PRIVATE,
  memberId: "member-1",
};

const mockCreatorProfile = {
  User: "creator-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "creator@example.com",
  role: UserRole.TEAM_ADMIN,
};

const mockMemberProfile = {
  User: "member-1",
  companyId: "COMP-1",
  divisionId: "DIV-2",
  departmentId: "DEPT-2",
  teamId: "TEAM-2",
  email: "member@example.com",
  role: UserRole.USER,
};

const parseBody = <T>(body: string) => JSON.parse(body) as T;

// 作成者と担当者で異なるプロフィールを返すモック
const makeBothProfilesMock = () =>
  vi.fn().mockImplementation((userId: string) => {
    if (userId === "creator-1") return Promise.resolve(mockCreatorProfile);
    if (userId === "member-1") return Promise.resolve(mockMemberProfile);
    return Promise.resolve(undefined);
  });

// PRIVATE スコープ等、組織リポジトリが呼ばれないケースで使用するダミー
const makeNeverCalledOrgRepos = () => ({
  divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
  deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
  teamRepo: { findById: vi.fn() } as unknown as TeamRepository,
});

describe("createTask", () => {
  // ========= 認証・入力検証 =========

  it("認証情報がない場合は 401 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithoutAuth(validBody));

    expect(response.statusCode).toBe(401);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("リクエストボディがない場合は 400 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventNoBody());

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("必須フィールドが不足している場合は 400 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { title: "タイトルのみ" }));

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("作成者プロフィールが存在しない場合は 500 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));

    expect(response.statusCode).toBe(500);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("存在しない memberId を指定した場合は 404 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve(mockCreatorProfile);
        return Promise.resolve(undefined);
      }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, memberId: "unknown-member" })
    );

    expect(response.statusCode).toBe(404);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("別会社の memberId を指定した場合は 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve(mockCreatorProfile);
        return Promise.resolve({ ...mockMemberProfile, companyId: "COMP-OTHER" });
      }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  // ========= ロール別スコープ制限 =========

  it("USER ロールが COMPANY スコープでタスクを作成しようとすると 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.USER });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, accessScope: AccessScope.COMPANY })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールが DEPARTMENT スコープでタスクを作成しようとすると 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.TEAM_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, accessScope: AccessScope.DEPARTMENT })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN ロールは自分の部署で DEPARTMENT スコープのタスクを作成できる", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.DEPT_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue({
        departmentId: "DEPT-1",
        divisionId: "DIV-1",
        companyId: "COMP-1",
      }),
    } as unknown as DepartmentRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo,
      teamRepo: { findById: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.DEPARTMENT,
        departmentId: "DEPT-1",
        divisionId: "DIV-1",
      })
    );

    expect(response.statusCode).toBe(201);
    expect(taskRepo.save).toHaveBeenCalledOnce();
  });

  it("COMPANY_ADMIN ロールは COMPANY スコープでタスクを作成できる", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.COMPANY_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, accessScope: AccessScope.COMPANY })
    );

    expect(response.statusCode).toBe(201);
    expect(taskRepo.save).toHaveBeenCalledOnce();
  });

  // ========= 正常系 =========

  it("正常なリクエストで 201 を返し、id がサーバー側で生成される", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));
    const body = parseBody<{ message: string; id: string }>(response.body);

    expect(response.statusCode).toBe(201);
    expect(body.id).toBeTruthy();
    expect(taskRepo.save).toHaveBeenCalledOnce();
  });

  it("クライアントから companyId/creatorId を渡しても、サーバー側の値で上書きされる", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const maliciousBody = {
      ...validBody,
      companyId: "INJECTED-COMPANY",
      creatorId: "INJECTED-CREATOR",
    };
    await handler(eventWithAuth("creator-1", maliciousBody));

    const savedTask = (taskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedTask.companyId).toBe("COMP-1");
    expect(savedTask.creatorId).toBe("creator-1");
  });

  it("status を WORKING で送っても保存値は NOT_STARTED になる", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(eventWithAuth("creator-1", { ...validBody, status: TaskStatus.WORKING }));

    const savedTask = (taskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedTask.status).toBe(TaskStatus.NOT_STARTED);
  });

  // ========= PRIVATE スコープ =========

  it("PRIVATE スコープでは担当者プロフィールの組織情報を使用する", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.PRIVATE,
        divisionId: "DIV-FROM-BODY", // PRIVATE なので無視されるべき
      })
    );

    const savedTask = (taskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedTask.divisionId).toBe("DIV-2"); // memberProfile の値
    expect(savedTask.departmentId).toBe("DEPT-2");
    expect(savedTask.teamId).toBe("TEAM-2");
  });

  // ========= 組織 ID 検証 =========

  it("TEAM スコープで teamId がない場合は 400 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;

    const handler = createHandler({ taskRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.TEAM,
        // teamId と departmentId を省略
      })
    );

    expect(response.statusCode).toBe(400);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("存在しない teamId を指定すると 404 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(),
    } as unknown as UserRepository;
    const teamRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.TEAM,
        teamId: "TEAM-NONEXISTENT",
        departmentId: "DEPT-1",
      })
    );

    expect(response.statusCode).toBe(404);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("存在しない departmentId を指定すると 404 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.DEPT_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo,
      teamRepo: { findById: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.DEPARTMENT,
        departmentId: "DEPT-NONEXISTENT",
        divisionId: "DIV-1",
      })
    );

    expect(response.statusCode).toBe(404);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("存在しない divisionId を指定すると 404 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.DIVISION_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const divisionRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DivisionRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo,
      deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
      teamRepo: { findById: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.DIVISION,
        divisionId: "DIV-NONEXISTENT",
      })
    );

    expect(response.statusCode).toBe(404);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN が別の teamId で TEAM タスクを作成しようとすると 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: makeBothProfilesMock(), // creator.teamId = "TEAM-1"
    } as unknown as UserRepository;
    const teamRepo = {
      findById: vi.fn().mockResolvedValue({
        teamId: "TEAM-99", // 別のチーム
        departmentId: "DEPT-1",
        divisionId: "DIV-1",
        companyId: "COMP-1",
      }),
    } as unknown as TeamRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.TEAM,
        teamId: "TEAM-99",
        departmentId: "DEPT-1",
      })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN が自分の department 外の teamId で TEAM タスクを作成しようとすると 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.DEPT_ADMIN }); // departmentId: "DEPT-1"
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const teamRepo = {
      findById: vi.fn().mockResolvedValue({
        teamId: "TEAM-X",
        departmentId: "DEPT-99", // 別の部署
        divisionId: "DIV-1",
        companyId: "COMP-1",
      }),
    } as unknown as TeamRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.TEAM,
        teamId: "TEAM-X",
        departmentId: "DEPT-99",
      })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外の departmentId で DEPARTMENT タスクを作成しようとすると 403 を返す", async () => {
    const taskRepo = { save: vi.fn() } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.DIVISION_ADMIN }); // divisionId: "DIV-1"
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue({
        departmentId: "DEPT-X",
        divisionId: "DIV-99", // 別の事業部
        companyId: "COMP-1",
      }),
    } as unknown as DepartmentRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo,
      teamRepo: { findById: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.DEPARTMENT,
        departmentId: "DEPT-X",
        divisionId: "DIV-99",
      })
    );

    expect(response.statusCode).toBe(403);
    expect(taskRepo.save).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN が同一会社の TEAM スコープでタスクを作成すると、チームレコードの組織情報が反映される", async () => {
    const taskRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((userId: string) => {
        if (userId === "creator-1") return Promise.resolve({ ...mockCreatorProfile, role: UserRole.COMPANY_ADMIN });
        return Promise.resolve(mockMemberProfile);
      }),
    } as unknown as UserRepository;
    const teamRepo = {
      findById: vi.fn().mockResolvedValue({
        teamId: "TEAM-BODY",
        departmentId: "DEPT-BODY",
        divisionId: "DIV-BODY",
        companyId: "COMP-1",
      }),
    } as unknown as TeamRepository;

    const handler = createHandler({
      taskRepo,
      userRepo,
      divisionRepo: { findById: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findById: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        accessScope: AccessScope.TEAM,
        teamId: "TEAM-BODY",
        departmentId: "DEPT-BODY",
      })
    );

    expect(response.statusCode).toBe(201);
    const savedTask = (taskRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedTask.teamId).toBe("TEAM-BODY");
    expect(savedTask.departmentId).toBe("DEPT-BODY");
    expect(savedTask.divisionId).toBe("DIV-BODY");
  });
});

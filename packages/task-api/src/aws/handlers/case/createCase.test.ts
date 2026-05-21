import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { CaseDeliveryType, CaseOwnerType, CaseStatus, CaseTargetScope, CaseType, UserRole } from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./createCase";

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

const validBody = {
  title: "Test Case",
  description: "desc",
  caseType: CaseType.REQUEST,
  deliveryType: CaseDeliveryType.DIRECT,
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
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

const mockTeam = {
  teamId: "TEAM-1",
  departmentId: "DEPT-1",
  divisionId: "DIV-1",
  companyId: "COMP-1",
};

const parseBody = <T>(body: string) => JSON.parse(body) as T;

const makeNeverCalledOrgRepos = () => ({
  divisionRepo: { findById: vi.fn(), findByCompanyId: vi.fn() } as unknown as DivisionRepository,
  deptRepo: { findByCompanyId: vi.fn() } as unknown as DepartmentRepository,
  teamRepo: { findByCompanyId: vi.fn().mockResolvedValue([mockTeam]) } as unknown as TeamRepository,
});

describe("createCase", () => {
  // ========= 認証・入力検証 =========

  it("JWT がない場合は 401", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithoutAuth(validBody));
    expect(response.statusCode).toBe(401);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("body がない場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventNoBody());
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("必須フィールドが不足している場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { title: "only title" }));
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("不正な caseType の場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, caseType: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な deliveryType の場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, deliveryType: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な targetScope の場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, targetScope: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("description が空文字の場合は 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, description: " " }));
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("creator profile がない場合は 500", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(undefined) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));
    expect(response.statusCode).toBe(500);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  // ========= scope 権限検証 =========

  it("USER ロールで COMPANY scope を指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.USER }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, targetScope: CaseTargetScope.COMPANY, targetScopeId: "COMP-1" })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN で DIVISION scope を指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, targetScope: CaseTargetScope.DIVISION, targetScopeId: "DIV-1" })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("requiredRole が creator role より高い場合は 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, requiredRole: UserRole.COMPANY_ADMIN })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("COMPANY scope で targetScopeId が creator companyId と異なる場合は 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.COMPANY_ADMIN }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.COMPANY,
        targetScopeId: "COMP-OTHER",
        requiredRole: UserRole.COMPANY_ADMIN,
      })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が他 division を targetScope に指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.DIVISION_ADMIN }),
    } as unknown as UserRepository;
    const divisionRepo = {
      findById: vi.fn().mockResolvedValue({ companyId: "COMP-1", divisionId: "DIV-OTHER" }),
      findByCompanyId: vi.fn(),
    } as unknown as DivisionRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo,
      deptRepo: { findByCompanyId: vi.fn() } as unknown as DepartmentRepository,
      teamRepo: { findByCompanyId: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.DIVISION,
        targetScopeId: "DIV-OTHER",
        requiredRole: UserRole.DIVISION_ADMIN,
      })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN が他 department を targetScope に指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.DEPT_ADMIN }),
    } as unknown as UserRepository;
    const deptRepo = {
      findByCompanyId: vi.fn().mockResolvedValue([
        { companyId: "COMP-1", divisionId: "DIV-1", departmentId: "DEPT-OTHER" },
      ]),
    } as unknown as DepartmentRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo: { findById: vi.fn(), findByCompanyId: vi.fn() } as unknown as DivisionRepository,
      deptRepo,
      teamRepo: { findByCompanyId: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.DEPARTMENT,
        targetScopeId: "DEPT-OTHER",
        requiredRole: UserRole.DEPT_ADMIN,
      })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN が他 team を targetScope に指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;
    const teamRepo = {
      findByCompanyId: vi.fn().mockResolvedValue([
        { companyId: "COMP-1", divisionId: "DIV-1", departmentId: "DEPT-1", teamId: "TEAM-OTHER" },
      ]),
    } as unknown as TeamRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo: { findById: vi.fn(), findByCompanyId: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findByCompanyId: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, targetScopeId: "TEAM-OTHER" })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("USER が自分以外の user を targetScope に指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((id: string) => {
        if (id === "creator-1") {
          return Promise.resolve({ ...mockCreatorProfile, role: UserRole.USER });
        }
        return Promise.resolve({ ...mockCreatorProfile, User: id, role: UserRole.USER });
      }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.USER,
        targetScopeId: "USER-OTHER",
      })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  // ========= org 存在検証 =========

  it("DIVISION scope で存在しない divisionId の場合は 404", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.DIVISION_ADMIN }),
    } as unknown as UserRepository;
    const divisionRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
      findByCompanyId: vi.fn(),
    } as unknown as DivisionRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo,
      deptRepo: { findByCompanyId: vi.fn() } as unknown as DepartmentRepository,
      teamRepo: { findByCompanyId: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.DIVISION,
        targetScopeId: "DIV-NONEXISTENT",
        requiredRole: UserRole.DIVISION_ADMIN,
      })
    );
    expect(response.statusCode).toBe(404);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("DEPARTMENT scope で存在しない departmentId の場合は 404", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.DEPT_ADMIN }),
    } as unknown as UserRepository;
    const deptRepo = {
      findByCompanyId: vi.fn().mockResolvedValue([]),
    } as unknown as DepartmentRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo: { findById: vi.fn(), findByCompanyId: vi.fn() } as unknown as DivisionRepository,
      deptRepo,
      teamRepo: { findByCompanyId: vi.fn() } as unknown as TeamRepository,
    });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.DEPARTMENT,
        targetScopeId: "DEPT-NONEXISTENT",
        requiredRole: UserRole.DEPT_ADMIN,
      })
    );
    expect(response.statusCode).toBe(404);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("TEAM scope で存在しない teamId の場合は 404", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;
    const teamRepo = {
      findByCompanyId: vi.fn().mockResolvedValue([]),
    } as unknown as TeamRepository;
    const handler = createHandler({
      caseRepo,
      userRepo,
      divisionRepo: { findById: vi.fn(), findByCompanyId: vi.fn() } as unknown as DivisionRepository,
      deptRepo: { findByCompanyId: vi.fn() } as unknown as DepartmentRepository,
      teamRepo,
    });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, targetScopeId: "TEAM-NONEXISTENT" })
    );
    expect(response.statusCode).toBe(404);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("USER scope で存在しない userId の場合は 404", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((id: string) => {
        if (id === "creator-1") return Promise.resolve(mockCreatorProfile);
        return Promise.resolve(undefined);
      }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.USER,
        targetScopeId: "USER-NONEXISTENT",
      })
    );
    expect(response.statusCode).toBe(404);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("USER scope で他会社ユーザーを指定すると 403", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockImplementation((id: string) => {
        if (id === "creator-1") return Promise.resolve(mockCreatorProfile);
        return Promise.resolve({ ...mockCreatorProfile, companyId: "COMP-OTHER" });
      }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.USER,
        targetScopeId: "USER-OTHER",
      })
    );
    expect(response.statusCode).toBe(403);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  // ========= 正常系 =========

  it("正常リクエストでは 201 と caseId を返す", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCreatorProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));
    const body = parseBody<{ caseId: string }>(response.body);
    expect(response.statusCode).toBe(201);
    expect(body.caseId).toBeTruthy();
    expect(caseRepo.save).toHaveBeenCalledOnce();
  });

  it("サーバーが status=WAITING, ownerType=USER, ownerId=creatorId を設定する", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCreatorProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(eventWithAuth("creator-1", validBody));
    const saved = (caseRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.status).toBe(CaseStatus.WAITING);
    expect(saved.ownerType).toBe(CaseOwnerType.USER);
    expect(saved.ownerId).toBe("creator-1");
  });

  it("クライアントの companyId 注入を無視して creator profile の値を使う", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCreatorProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(eventWithAuth("creator-1", { ...validBody, companyId: "INJECTED", creatorId: "INJECTED" }));
    const saved = (caseRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.companyId).toBe("COMP-1");
    expect(saved.creatorId).toBe("creator-1");
  });

  it("任意フィールド dueDate を含む場合も正常に保存する", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCreatorProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(
      eventWithAuth("creator-1", { ...validBody, dueDate: "2026-12-31" })
    );
    const saved = (caseRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.dueDate).toBe("2026-12-31");
    expect(saved.projectId).toBeNull();
    expect(saved.parentCaseId).toBeNull();
  });

  it("projectId を指定すると 400（未対応フィールド）", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, projectId: "PROJ-1" })
    );
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("parentCaseId を指定すると 400（未対応フィールド）", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", { ...validBody, parentCaseId: "CASE-PARENT" })
    );
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN が COMPANY scope で自社 case を作成すると 201", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCreatorProfile, role: UserRole.COMPANY_ADMIN }),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(
      eventWithAuth("creator-1", {
        ...validBody,
        targetScope: CaseTargetScope.COMPANY,
        targetScopeId: "COMP-1",
        requiredRole: UserRole.COMPANY_ADMIN,
      })
    );
    expect(response.statusCode).toBe(201);
    expect(caseRepo.save).toHaveBeenCalledOnce();
  });
});

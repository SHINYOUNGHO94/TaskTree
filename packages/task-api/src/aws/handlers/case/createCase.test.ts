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
  // ========= 인증/입력 검증 =========

  it("JWT 없으면 401", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithoutAuth(validBody));
    expect(response.statusCode).toBe(401);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("body 없으면 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventNoBody());
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("필수 필드 누락 시 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { title: "only title" }));
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("잘못된 caseType 값 시 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, caseType: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("잘못된 deliveryType 값 시 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, deliveryType: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("잘못된 targetScope 값 시 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, targetScope: "INVALID" }));
    expect(response.statusCode).toBe(400);
  });

  it("description이 빈 문자열이면 400", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", { ...validBody, description: " " }));
    expect(response.statusCode).toBe(400);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  it("creator profile 없으면 500", async () => {
    const caseRepo = { save: vi.fn() } as unknown as CaseRepository;
    const userRepo = { findByUserId: vi.fn().mockResolvedValue(undefined) } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    const response = await handler(eventWithAuth("creator-1", validBody));
    expect(response.statusCode).toBe(500);
    expect(caseRepo.save).not.toHaveBeenCalled();
  });

  // ========= scope 권한 검증 =========

  it("USER 역할로 COMPANY scope → 403", async () => {
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

  it("TEAM_ADMIN으로 DIVISION scope → 403", async () => {
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

  it("requiredRole이 creator role보다 높으면 403", async () => {
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

  it("COMPANY scope에서 targetScopeId가 creator companyId와 다르면 403", async () => {
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

  it("DIVISION_ADMIN이 다른 division을 targetScope로 지정하면 403", async () => {
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

  it("DEPT_ADMIN이 다른 department를 targetScope로 지정하면 403", async () => {
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

  it("TEAM_ADMIN이 다른 team을 targetScope로 지정하면 403", async () => {
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

  it("USER는 자신이 아닌 user를 targetScope로 지정하면 403", async () => {
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

  // ========= org 존재 검증 =========

  it("DIVISION scope + 존재하지 않는 divisionId → 404", async () => {
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

  it("DEPARTMENT scope + 존재하지 않는 departmentId → 404", async () => {
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

  it("TEAM scope + 존재하지 않는 teamId → 404", async () => {
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

  it("USER scope + 존재하지 않는 userId → 404", async () => {
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

  it("USER scope + 타 회사 사용자 → 403", async () => {
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

  // ========= 정상 흐름 =========

  it("정상 요청 시 201 + caseId 반환", async () => {
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

  it("서버가 status=WAITING, ownerType=USER, ownerId=creatorId 설정", async () => {
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

  it("클라이언트 companyId 주입 시도 → 무시하고 creator profile 값 사용", async () => {
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

  it("선택 필드(dueDate, projectId) 포함 시 정상 저장", async () => {
    const caseRepo = { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCreatorProfile),
    } as unknown as UserRepository;
    const handler = createHandler({ caseRepo, userRepo, ...makeNeverCalledOrgRepos() });
    await handler(
      eventWithAuth("creator-1", { ...validBody, dueDate: "2026-12-31", projectId: "PROJ-1" })
    );
    const saved = (caseRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(saved.dueDate).toBe("2026-12-31");
    expect(saved.projectId).toBe("PROJ-1");
    expect(saved.parentCaseId).toBeNull();
  });

  it("COMPANY_ADMIN이 COMPANY scope로 자사 case 생성 시 201", async () => {
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

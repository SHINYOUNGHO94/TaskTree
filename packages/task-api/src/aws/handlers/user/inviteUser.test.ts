import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { createHandler } from "./inviteUser";

// Cognito API の呼び出しをモックする
vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  const mockSend = vi.fn().mockResolvedValue({
    User: {
      Attributes: [{ Name: "sub", Value: "new-user-id" }],
    },
  });
  class MockCognitoClient {
    send = mockSend;
  }
  return {
    CognitoIdentityProviderClient: MockCognitoClient,
    AdminCreateUserCommand: vi.fn(),
  };
});

const eventWithAuth = (sub: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const eventWithoutAuth = (): APIGatewayProxyEvent =>
  ({
    requestContext: {},
    body: JSON.stringify({}),
  }) as unknown as APIGatewayProxyEvent;

const mockCompanyAdmin = {
  User: "admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.COMPANY_ADMIN,
};

const mockDivisionAdmin = {
  User: "div-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.DIVISION_ADMIN,
};

const mockDeptAdmin = {
  User: "dept-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.DEPT_ADMIN,
};

const mockTeamAdmin = {
  User: "team-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.TEAM_ADMIN,
};

const validInviteBody = {
  email: "new@example.com",
  name: "新メンバー",
  role: UserRole.USER,
};

const mockDivision = {
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "第一事業部",
};

const mockDepartment = {
  departmentId: "DEPT-1",
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "開発部",
};

const mockTeam = {
  teamId: "TEAM-1",
  departmentId: "DEPT-1",
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "開発チーム",
};

const makeOrgRepos = (overrides: {
  divisionRepo?: Partial<DivisionRepository>;
  deptRepo?: Partial<DepartmentRepository>;
  teamRepo?: Partial<TeamRepository>;
} = {}) => ({
  divisionRepo: {
    findById: vi.fn().mockResolvedValue(mockDivision),
    ...overrides.divisionRepo,
  } as unknown as DivisionRepository,
  deptRepo: {
    findById: vi.fn().mockResolvedValue(mockDepartment),
    ...overrides.deptRepo,
  } as unknown as DepartmentRepository,
  teamRepo: {
    findById: vi.fn().mockResolvedValue(mockTeam),
    ...overrides.teamRepo,
  } as unknown as TeamRepository,
});

describe("inviteUser", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const userRepo = { findByUserId: vi.fn(), create: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(eventWithoutAuth());

    expect(response.statusCode).toBe(401);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("プロフィールが存在しない場合は 403 を返す", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(eventWithAuth("admin-1", validInviteBody));

    expect(response.statusCode).toBe(403);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("USER ロールでは招待できない (403)", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockCompanyAdmin, role: UserRole.USER }),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(eventWithAuth("user-1", validInviteBody));

    expect(response.statusCode).toBe(403);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("自分より上位のロールは付与できない (403)", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockTeamAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("team-admin-1", { ...validInviteBody, role: UserRole.COMPANY_ADMIN })
    );

    expect(response.statusCode).toBe(403);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN が自分のチーム以外の teamId を指定しても自分のチームに強制される", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockTeamAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("team-admin-1", { ...validInviteBody, teamId: "TEAM-OTHER" })
    );

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "TEAM-1", departmentId: "DEPT-1", divisionId: "DIV-1" })
    );
  });

  it("DEPT_ADMIN が自分の department 外の departmentId を指定しても自分の部署に強制される", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("dept-admin-1", { ...validInviteBody, departmentId: "DEPT-OTHER" })
    );

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ departmentId: "DEPT-1", divisionId: "DIV-1" })
    );
  });

  it("DIVISION_ADMIN が自分の division 外の divisionId を指定しても自分の本部に強制される", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("div-admin-1", { ...validInviteBody, divisionId: "DIV-OTHER" })
    );

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ divisionId: "DIV-1" })
    );
  });

  it("存在しない divisionId では COMPANY_ADMIN でも招待できない", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;
    const orgRepos = makeOrgRepos({
      divisionRepo: { findById: vi.fn().mockResolvedValue(undefined) },
    });

    const handler = createHandler({ userRepo, ...orgRepos });
    const response = await handler(
      eventWithAuth("admin-1", { ...validInviteBody, divisionId: "DIV-NOT-FOUND" })
    );

    expect(response.statusCode).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("存在しない departmentId では COMPANY_ADMIN でも招待できない", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;
    const orgRepos = makeOrgRepos({
      deptRepo: { findById: vi.fn().mockResolvedValue(undefined) },
    });

    const handler = createHandler({ userRepo, ...orgRepos });
    const response = await handler(
      eventWithAuth("admin-1", { ...validInviteBody, divisionId: "DIV-1", departmentId: "DEPT-NOT-FOUND" })
    );

    expect(response.statusCode).toBe(404);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("指定 department と team の親子関係が一致しない場合は 403 を返す", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;
    const orgRepos = makeOrgRepos({
      teamRepo: {
        findById: vi.fn().mockResolvedValue({
          ...mockTeam,
          departmentId: "DEPT-OTHER",
        }),
      },
    });

    const handler = createHandler({ userRepo, ...orgRepos });
    const response = await handler(
      eventWithAuth("admin-1", {
        ...validInviteBody,
        divisionId: "DIV-1",
        departmentId: "DEPT-1",
        teamId: "TEAM-1",
      })
    );

    expect(response.statusCode).toBe(403);
    expect(userRepo.create).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN は正常にユーザーを招待できる", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(eventWithAuth("admin-1", validInviteBody));

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledOnce();
  });

  it("COMPANY_ADMIN が DIVISION_ADMIN を招待できる", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("admin-1", { ...validInviteBody, role: UserRole.DIVISION_ADMIN, divisionId: "DIV-1" })
    );

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledOnce();
  });

  it("TEAM_ADMIN は同一ロール (TEAM_ADMIN) を招待できる", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockTeamAdmin),
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("team-admin-1", {
        ...validInviteBody,
        role: UserRole.TEAM_ADMIN,
        teamId: "TEAM-1",
      })
    );

    expect(response.statusCode).toBe(200);
    expect(userRepo.create).toHaveBeenCalledOnce();
  });

  it("招待されるユーザーの companyId はサーバー側 (招待者) の companyId が使われる", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    await handler(
      eventWithAuth("admin-1", { ...validInviteBody, companyId: "INJECTED-COMPANY" })
    );

    const savedUser = (userRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedUser.companyId).toBe("COMP-1");
  });

  it("無効なロール文字列を指定すると 400 を返す", async () => {
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
      create: vi.fn(),
    } as unknown as UserRepository;

    const handler = createHandler({ userRepo, ...makeOrgRepos() });
    const response = await handler(
      eventWithAuth("admin-1", { ...validInviteBody, role: "SUPER_ADMIN" })
    );

    expect(response.statusCode).toBe(400);
    expect(userRepo.create).not.toHaveBeenCalled();
  });
});

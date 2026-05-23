import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { UserRole } from "@task/core";
import { UserRepository } from "@/repositories/userRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { createHandler } from "./createTeam";

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

const mockCompanyAdmin = {
  User: "admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "NONE",
  role: UserRole.COMPANY_ADMIN,
};

const mockDivisionAdmin = {
  User: "div-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "NONE",
  teamId: "NONE",
  role: UserRole.DIVISION_ADMIN,
};

const mockDeptAdmin = {
  User: "dept-admin-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "NONE",
  role: UserRole.DEPT_ADMIN,
};

const mockDept = {
  departmentId: "DEPT-1",
  divisionId: "DIV-1",
  companyId: "COMP-1",
  name: "開発部",
};

const validBodyForAdmin = { departmentId: "DEPT-1", divisionId: "DIV-1", teamId: "TEAM-NEW", name: "新チーム" };

describe("createTeam", () => {
  it("認証情報がない場合は 401 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = { findById: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = { findByUserId: vi.fn() } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithoutAuth(validBodyForAdmin));

    expect(response.statusCode).toBe(401);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("TEAM_ADMIN ロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = { findById: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockDeptAdmin, role: UserRole.TEAM_ADMIN }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("team-admin-1", validBodyForAdmin));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("USER ロールでは 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = { findById: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue({ ...mockDeptAdmin, role: UserRole.USER }),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("user-1", validBodyForAdmin));

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN が自分の department 外の departmentId でチームを作成しようとすると 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = { findById: vi.fn() } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin), // departmentId: "DEPT-1"
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("dept-admin-1", { ...validBodyForAdmin, departmentId: "DEPT-OTHER" })
    );

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("DIVISION_ADMIN が自分の division 外の department でチームを作成しようとすると 403 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(undefined), // division 配下に dept が存在しない
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin), // divisionId: "DIV-1"
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("div-admin-1", { ...validBodyForAdmin, departmentId: "DEPT-OTHER" })
    );

    expect(response.statusCode).toBe(403);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("COMPANY_ADMIN が存在しない departmentId を指定すると 404 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("admin-1", { ...validBodyForAdmin, departmentId: "DEPT-NONEXISTENT" })
    );

    expect(response.statusCode).toBe(404);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("DEPT_ADMIN は自分の department 配下にチームを作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(mockDept),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("dept-admin-1", { departmentId: "DEPT-1", teamId: "TEAM-NEW", name: "新チーム" })
    );

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("DIVISION_ADMIN は自分の division 配下の department にチームを作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(mockDept), // DIV-1 配下に DEPT-1 が存在
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDivisionAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("div-admin-1", { departmentId: "DEPT-1", teamId: "TEAM-NEW", name: "新チーム" })
    );

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("COMPANY_ADMIN は有効な department でチームを作成できる", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(mockDept),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockCompanyAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(eventWithAuth("admin-1", validBodyForAdmin));

    expect(response.statusCode).toBe(201);
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it("DEPT_ADMIN がチームを作成するとき、divisionId はサーバー側プロフィールの値が使用される", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(mockDept),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin), // divisionId: "DIV-1"
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    await handler(
      eventWithAuth("dept-admin-1", {
        departmentId: "DEPT-1",
        teamId: "TEAM-NEW",
        name: "新チーム",
        divisionId: "INJECTED-DIV", // 無視されるべき
      })
    );

    const savedRecord = (repository.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedRecord.divisionId).toBe("DIV-1");
    expect(savedRecord.companyId).toBe("COMP-1");
  });

  it("DEPT_ADMIN の department が存在しない場合は 404 を返す", async () => {
    const repository = { create: vi.fn() } as unknown as TeamRepository;
    const deptRepo = {
      findById: vi.fn().mockResolvedValue(undefined),
    } as unknown as DepartmentRepository;
    const userRepo = {
      findByUserId: vi.fn().mockResolvedValue(mockDeptAdmin),
    } as unknown as UserRepository;

    const handler = createHandler({ repository, deptRepo, userRepo });
    const response = await handler(
      eventWithAuth("dept-admin-1", { departmentId: "DEPT-1", teamId: "TEAM-NEW", name: "新チーム" })
    );

    expect(response.statusCode).toBe(404);
    expect(repository.create).not.toHaveBeenCalled();
  });
});

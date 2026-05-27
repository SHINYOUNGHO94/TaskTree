import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseParticipantType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import { createHandler } from "./inviteParticipantCompany";

const makeEvent = (sub: string | null, caseId: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: sub ? { authorizer: { claims: { sub } } } : {},
    pathParameters: { id: caseId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const ownerProfile = {
  User: "owner-user-1",
  companyId: "OWNER-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "owner@example.com",
  role: UserRole.COMPANY_ADMIN,
};

const openCase = {
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  creatorId: "owner-user-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "owner-user-1",
  deliveryType: CaseDeliveryType.OPEN,
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  title: "Open Case",
  description: "desc",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const directCase = { ...openCase, deliveryType: CaseDeliveryType.DIRECT };

const targetCompany = { Company: "EXT-COMP", name: "External Co", pk: "Company", sk: "Company#EXT-COMP", at: "2026-01-01T00:00:00.000Z" };

const makeHistoryRepo = () =>
  ({ save: vi.fn().mockResolvedValue(undefined) }) as unknown as CaseHistoryRepository;

const makeDeps = (overrides?: Partial<Parameters<typeof createHandler>[0]>) =>
  createHandler({
    caseRepo: {
      findById: vi.fn().mockResolvedValue(openCase),
    } as unknown as CaseRepository,
    participantCompanyRepo: {
      findByCaseAndCompany: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseParticipantCompanyRepository,
    caseHistoryRepo: makeHistoryRepo(),
    userRepo: {
      findByUserId: vi.fn().mockResolvedValue(ownerProfile),
    } as unknown as UserRepository,
    companyRepo: {
      findById: vi.fn().mockResolvedValue(targetCompany),
    } as unknown as CompanyRepository,
    ...overrides,
  });

describe("inviteParticipantCompany", () => {
  it("JWT がない場合は 401", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent(null, "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn() } as unknown as CaseRepository,
      participantCompanyRepo: { findByCaseAndCompany: vi.fn(), save: vi.fn() } as unknown as CaseParticipantCompanyRepository,
      caseHistoryRepo: makeHistoryRepo(),
      userRepo: { findByUserId: vi.fn() } as unknown as UserRepository,
      companyRepo: { findById: vi.fn() } as unknown as CompanyRepository,
    });
    const event = { requestContext: { authorizer: { claims: { sub: "owner-user-1" } } }, pathParameters: { id: "CASE-1" }, body: null } as unknown as APIGatewayProxyEvent;
    const res = await handler(event);
    expect(res.statusCode).toBe(400);
  });

  it("DIRECT case への招待は 400", async () => {
    const handler = makeDeps({
      caseRepo: { findById: vi.fn().mockResolvedValue(directCase) } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(400);
  });

  it("owner ではないユーザーは 403", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...ownerProfile, User: "other-user" }),
      } as unknown as UserRepository,
      caseRepo: {
        findById: vi.fn().mockResolvedValue({ ...openCase, creatorId: "owner-user-1", ownerId: "owner-user-1" }),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("other-user", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(403);
  });

  it("own company への招待は 400", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "OWNER-COMP" }));
    expect(res.statusCode).toBe(400);
  });

  it("存在しない company は 404", async () => {
    const handler = makeDeps({
      companyRepo: { findById: vi.fn().mockResolvedValue(undefined) } as unknown as CompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "NONEXISTENT" }));
    expect(res.statusCode).toBe(404);
  });

  it("INVITED 状態の重複招待は 400", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          status: CaseParticipantCompanyStatus.INVITED,
        }),
        save: vi.fn(),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(400);
  });

  it("ACTIVE 状態の重複招待は 400", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          status: CaseParticipantCompanyStatus.ACTIVE,
        }),
        save: vi.fn(),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(400);
  });

  it("正常招待で 201 と participantCompanyId を返す", async () => {
    const saveRepo = { findByCaseAndCompany: vi.fn().mockResolvedValue(undefined), save: vi.fn().mockResolvedValue(undefined) };
    const handler = makeDeps({ participantCompanyRepo: saveRepo as unknown as CaseParticipantCompanyRepository });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { participantCompanyId: string };
    expect(body.participantCompanyId).toBe("EXT-COMP");
    expect(saveRepo.save).toHaveBeenCalledOnce();
  });

  it("client-supplied owner field (companyId が owner company) は 400 になる", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "OWNER-COMP" }));
    expect(res.statusCode).toBe(400);
  });
});

const projectCase = {
  caseId: "PROJ-1",
  companyId: "OWNER-COMP",
  creatorId: "owner-user-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "owner-user-1",
  deliveryType: CaseDeliveryType.DIRECT,
  caseType: CaseType.PROJECT,
  status: CaseStatus.WAITING,
  title: "Project",
  description: "desc",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("inviteParticipantCompany CLIENT type", () => {
  it("CLIENT + PROJECT case は 201", async () => {
    const saveRepo = { findByCaseAndCompany: vi.fn().mockResolvedValue(undefined), save: vi.fn().mockResolvedValue(undefined) };
    const handler = makeDeps({
      caseRepo: { findById: vi.fn().mockResolvedValue(projectCase) } as unknown as CaseRepository,
      participantCompanyRepo: saveRepo as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "PROJ-1", { companyId: "EXT-COMP", participantType: CaseParticipantType.CLIENT }));
    expect(res.statusCode).toBe(201);
  });

  it("CLIENT + REQUEST case は 400", async () => {
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({
          ...projectCase,
          caseType: CaseType.REQUEST,
          deliveryType: CaseDeliveryType.OPEN,
        }),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "PROJ-1", { companyId: "EXT-COMP", participantType: CaseParticipantType.CLIENT }));
    expect(res.statusCode).toBe(400);
  });

  it("CLIENT + STANDARD case は 400", async () => {
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({
          ...projectCase,
          caseType: CaseType.STANDARD,
          deliveryType: CaseDeliveryType.OPEN,
        }),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "PROJ-1", { companyId: "EXT-COMP", participantType: CaseParticipantType.CLIENT }));
    expect(res.statusCode).toBe(400);
  });

  it("participantType 省略時は COLLABORATOR としてデフォルト処理され保存される", async () => {
    const saveRepo = { findByCaseAndCompany: vi.fn().mockResolvedValue(undefined), save: vi.fn().mockResolvedValue(undefined) };
    const handler = makeDeps({
      participantCompanyRepo: saveRepo as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "CASE-1", { companyId: "EXT-COMP" }));
    expect(res.statusCode).toBe(201);
    const savedEntity = saveRepo.save.mock.calls[0][0] as { participantType: CaseParticipantType };
    expect(savedEntity.participantType).toBe(CaseParticipantType.COLLABORATOR);
  });

  it("CLIENT は DIRECT PROJECT にも招待可能 (deliveryType 無関係)", async () => {
    const saveRepo = { findByCaseAndCompany: vi.fn().mockResolvedValue(undefined), save: vi.fn().mockResolvedValue(undefined) };
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({ ...projectCase, deliveryType: CaseDeliveryType.DIRECT }),
      } as unknown as CaseRepository,
      participantCompanyRepo: saveRepo as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("owner-user-1", "PROJ-1", { companyId: "EXT-COMP", participantType: CaseParticipantType.CLIENT }));
    expect(res.statusCode).toBe(201);
  });
});

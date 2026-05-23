import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./updateParticipantCompanyStatus";

const makeEvent = (sub: string | null, caseId: string, participantCompanyId: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: sub ? { authorizer: { claims: { sub } } } : {},
    pathParameters: { id: caseId, participantCompanyId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const invitedCompanyProfile = {
  User: "invited-admin",
  companyId: "EXT-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "admin@ext.com",
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

const invitedRecord = {
  participantCompanyId: "EXT-COMP",
  caseId: "CASE-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "EXT-COMP",
  companyName: "External Co",
  status: CaseParticipantCompanyStatus.INVITED,
  invitedBy: "owner-user-1",
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeHistoryRepo = () =>
  ({ save: vi.fn().mockResolvedValue(undefined) }) as unknown as CaseHistoryRepository;

const makeDeps = (overrides?: Partial<Parameters<typeof createHandler>[0]>) =>
  createHandler({
    caseRepo: { findById: vi.fn().mockResolvedValue(openCase) } as unknown as CaseRepository,
    participantCompanyRepo: {
      findByCaseAndCompany: vi.fn().mockResolvedValue(invitedRecord),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseParticipantCompanyRepository,
    caseHistoryRepo: makeHistoryRepo(),
    userRepo: { findByUserId: vi.fn().mockResolvedValue(invitedCompanyProfile) } as unknown as UserRepository,
    ...overrides,
  });

describe("updateParticipantCompanyStatus", () => {
  it("JWT がない場合は 401", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent(null, "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(401);
  });

  it("invited company の COMPANY_ADMIN が accept で 200", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(200);
  });

  it("invited company の COMPANY_ADMIN が reject で 200", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "REJECTED" }));
    expect(res.statusCode).toBe(200);
  });

  it("invited company の USER ロールは 403", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...invitedCompanyProfile, role: UserRole.USER }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("TEAM_ADMIN ロールは 403", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...invitedCompanyProfile, role: UserRole.TEAM_ADMIN }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("owner company user は 403 (invited company 以外は拒否)", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...invitedCompanyProfile, companyId: "OWNER-COMP" }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("owner-user", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("他の company user は 403", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...invitedCompanyProfile, companyId: "OTHER-COMP" }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("other-user", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("INVITED 以外の record は 400", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({ ...invitedRecord, status: CaseParticipantCompanyStatus.ACTIVE }),
        save: vi.fn(),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(400);
  });

  it("不正な status は 400", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "REMOVED" }));
    expect(res.statusCode).toBe(400);
  });

  it("存在しない participant record は 404", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(undefined),
        save: vi.fn(),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("invited-admin", "CASE-1", "EXT-COMP", { status: "ACTIVE" }));
    expect(res.statusCode).toBe(404);
  });
});

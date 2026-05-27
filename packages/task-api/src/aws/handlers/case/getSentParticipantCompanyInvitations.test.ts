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
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getSentParticipantCompanyInvitations";

const makeEvent = (sub: string | null): APIGatewayProxyEvent =>
  ({
    requestContext: sub ? { authorizer: { claims: { sub } } } : {},
  }) as unknown as APIGatewayProxyEvent;

const ownerProfile = {
  User: "user-1",
  companyId: "OWNER-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "owner@example.com",
  role: UserRole.COMPANY_ADMIN,
};

const caseDetail = {
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  creatorId: "user-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "user-1",
  deliveryType: CaseDeliveryType.OPEN,
  caseType: CaseType.PROJECT,
  status: CaseStatus.IN_PROGRESS,
  title: "My Project",
  description: "desc",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  targetScope: CaseTargetScope.COMPANY,
  targetScopeId: "OWNER-COMP",
  requiredRole: UserRole.USER,
  projectId: null,
  parentCaseId: null,
  dueDate: "2026-12-31",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const participantRecord = {
  participantCompanyId: "EXT-COMP",
  caseId: "CASE-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "EXT-COMP",
  companyName: "External Corp",
  status: CaseParticipantCompanyStatus.ACTIVE,
  invitedBy: "user-1",
  reviewedBy: null,
  reviewedAt: null,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const makeDeps = (overrides?: Partial<Parameters<typeof createHandler>[0]>) =>
  createHandler({
    caseRepo: {
      findCaseIdsByUser: vi.fn().mockResolvedValue(["CASE-1"]),
      findById: vi.fn().mockResolvedValue(caseDetail),
    } as unknown as CaseRepository,
    participantCompanyRepo: {
      findByCaseId: vi.fn().mockResolvedValue([participantRecord]),
    } as unknown as CaseParticipantCompanyRepository,
    userRepo: {
      findByUserId: vi.fn().mockResolvedValue(ownerProfile),
    } as unknown as UserRepository,
    ...overrides,
  });

describe("getSentParticipantCompanyInvitations", () => {
  it("JWT がない場合は 401", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent(null));
    expect(res.statusCode).toBe(401);
  });

  it("担当 case がない場合は 200 で空配列", async () => {
    const handler = makeDeps({
      caseRepo: {
        findCaseIdsByUser: vi.fn().mockResolvedValue([]),
        findById: vi.fn(),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("user-1"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("participant company がない case は除外される", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseId: vi.fn().mockResolvedValue([]),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("user-1"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("別 tenant の participant record はフィルタされる", async () => {
    const otherTenantRecord = { ...participantRecord, ownerCompanyId: "OTHER-COMP" };
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseId: vi.fn().mockResolvedValue([otherTenantRecord]),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("user-1"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("正常ケース: 担当 case の participant company invitation を返す", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("user-1"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as unknown[];
    expect(body).toHaveLength(1);
    const inv = body[0] as {
      participantCompany: { companyId: string; status: string };
      caseSummary: { caseId: string; title: string; dueDate: string | null };
    };
    expect(inv.participantCompany.companyId).toBe("EXT-COMP");
    expect(inv.participantCompany.status).toBe(CaseParticipantCompanyStatus.ACTIVE);
    expect(inv.caseSummary.caseId).toBe("CASE-1");
    expect(inv.caseSummary.title).toBe("My Project");
    expect(inv.caseSummary.dueDate).toBe("2026-12-31");
  });

  it("findCaseIdsByUser に userId と companyId が渡される", async () => {
    const findCaseIdsByUser = vi.fn().mockResolvedValue([]);
    const handler = makeDeps({
      caseRepo: {
        findCaseIdsByUser,
        findById: vi.fn(),
      } as unknown as CaseRepository,
    });
    await handler(makeEvent("user-1"));
    expect(findCaseIdsByUser).toHaveBeenCalledWith("user-1", "OWNER-COMP");
  });
});

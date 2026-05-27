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
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getCase";

const makeEvent = (sub: string, caseId: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId },
  }) as unknown as APIGatewayProxyEvent;

const ownerCase = {
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  creatorId: "creator-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "creator-1",
  deliveryType: CaseDeliveryType.OPEN,
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  title: "Test Case",
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

const activeParticipantRecord = {
  participantCompanyId: "EXT-COMP",
  caseId: "CASE-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "EXT-COMP",
  companyName: null,
  status: CaseParticipantCompanyStatus.ACTIVE,
  invitedBy: "creator-1",
  reviewedBy: "ext-admin",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const invitedParticipantRecord = {
  ...activeParticipantRecord,
  status: CaseParticipantCompanyStatus.INVITED,
};

describe("getCase participant company access", () => {
  it("ACTIVE participant company user は case を読める", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(activeParticipantRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({
          User: "ext-user",
          companyId: "EXT-COMP",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          role: UserRole.USER,
        }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("ext-user", "CASE-1"));
    expect(res.statusCode).toBe(200);
  });

  it("ACTIVE participant company user でも DIRECT case は 403", async () => {
    const handler = createHandler({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({
          ...ownerCase,
          deliveryType: CaseDeliveryType.DIRECT,
        }),
      } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(activeParticipantRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({
          User: "ext-user",
          companyId: "EXT-COMP",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          role: UserRole.USER,
        }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("ext-user", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });

  it("別 case の participant record では 403", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          ...activeParticipantRecord,
          caseId: "CASE-OTHER",
        }),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({
          User: "ext-user",
          companyId: "EXT-COMP",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          role: UserRole.USER,
        }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("ext-user", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });

  it("INVITED のみの participant company user は 403", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(invitedParticipantRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({
          User: "ext-user",
          companyId: "EXT-COMP",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          role: UserRole.USER,
        }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("ext-user", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });

  it("participant record のない他社 user は 403", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(undefined),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({
          User: "unrelated-user",
          companyId: "UNRELATED-COMP",
          divisionId: "DIV-1",
          departmentId: "DEPT-1",
          teamId: "TEAM-1",
          role: UserRole.USER,
        }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("unrelated-user", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });
});

const projectCase = {
  caseId: "PROJ-1",
  companyId: "OWNER-COMP",
  creatorId: "creator-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "creator-1",
  deliveryType: CaseDeliveryType.DIRECT,
  caseType: CaseType.PROJECT,
  status: CaseStatus.WAITING,
  title: "Project Case",
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

const childCase = {
  ...projectCase,
  caseId: "CHILD-1",
  caseType: CaseType.STANDARD,
  projectId: "PROJ-1",
  parentCaseId: "PROJ-1",
};

const clientRecord = {
  participantCompanyId: "CLIENT-COMP",
  caseId: "PROJ-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "CLIENT-COMP",
  companyName: "Client Co",
  status: CaseParticipantCompanyStatus.ACTIVE,
  participantType: CaseParticipantType.CLIENT,
  invitedBy: "creator-1",
  reviewedBy: "client-admin",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const clientUserProfile = {
  User: "client-user",
  companyId: "CLIENT-COMP",
  divisionId: "DIV-2",
  departmentId: "DEPT-2",
  teamId: "TEAM-2",
  role: UserRole.USER,
};

describe("getCase CLIENT participant access", () => {
  it("CLIENT が招待された PROJECT は 200", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(projectCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(clientRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientUserProfile) } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1"));
    expect(res.statusCode).toBe(200);
  });

  it("CLIENT は DIRECT deliveryType の PROJECT でも 200", async () => {
    const handler = createHandler({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({ ...projectCase, deliveryType: CaseDeliveryType.DIRECT }),
      } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(clientRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientUserProfile) } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1"));
    expect(res.statusCode).toBe(200);
  });

  it("CLIENT は招待された PROJECT の child STANDARD を 200 で読める (parent record で解決)", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(childCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi
          .fn()
          .mockResolvedValueOnce(undefined)       // childCase に対する直接 record なし
          .mockResolvedValueOnce(clientRecord),   // projectId PROJ-1 に対する CLIENT record あり
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientUserProfile) } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "CHILD-1"));
    expect(res.statusCode).toBe(200);
  });

  it("CLIENT が child case を読む際に projectId に参加していなければ 403", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(childCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(undefined),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...clientUserProfile, companyId: "OTHER-COMP" }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "CHILD-1"));
    expect(res.statusCode).toBe(403);
  });

  it("CLIENT が INVITED のみ(未承認) の場合は 403", async () => {
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(projectCase) } as unknown as CaseRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          ...clientRecord,
          status: CaseParticipantCompanyStatus.INVITED,
        }),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientUserProfile) } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1"));
    expect(res.statusCode).toBe(403);
  });
});

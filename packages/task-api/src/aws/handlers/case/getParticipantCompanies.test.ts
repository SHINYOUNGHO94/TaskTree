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
import { createHandler } from "./getParticipantCompanies";

const makeEvent = (sub: string, caseId: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId },
  }) as unknown as APIGatewayProxyEvent;

const projectCase = {
  caseId: "PROJ-1",
  companyId: "OWNER-COMP",
  creatorId: "owner-user",
  ownerType: CaseOwnerType.USER,
  ownerId: "owner-user",
  deliveryType: CaseDeliveryType.DIRECT,
  caseType: CaseType.PROJECT,
  status: CaseStatus.REVIEW_REQUESTED,
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

const clientProfile = {
  User: "client-user",
  companyId: "CLIENT-COMP",
  divisionId: "DIV-2",
  departmentId: "DEPT-2",
  teamId: "TEAM-2",
  role: UserRole.USER,
};

const clientRecord = {
  participantCompanyId: "CLIENT-COMP",
  caseId: "PROJ-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "CLIENT-COMP",
  companyName: "Client Co",
  status: CaseParticipantCompanyStatus.ACTIVE,
  participantType: CaseParticipantType.CLIENT,
  invitedBy: "owner-user",
  reviewedBy: "client-admin",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("getParticipantCompanies CLIENT access", () => {
  it("CLIENT は DIRECT PROJECT の participant companies を取得できる", async () => {
    const participantCompanyRepo = {
      findByCaseAndCompany: vi.fn().mockResolvedValue(clientRecord),
      findByCaseId: vi.fn().mockResolvedValue([clientRecord]),
    } as unknown as CaseParticipantCompanyRepository;
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(projectCase) } as unknown as CaseRepository,
      participantCompanyRepo,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientProfile) } as unknown as UserRepository,
    });

    const res = await handler(makeEvent("client-user", "PROJ-1"));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([clientRecord]);
    expect(JSON.parse(res.body)[0].participantType).toBe(CaseParticipantType.CLIENT);
  });

  it("CLIENT は PROJECT record 経由で child case の participant companies を取得できる", async () => {
    const findByCaseAndCompany = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(clientRecord);
    const participantCompanyRepo = {
      findByCaseAndCompany,
      findByCaseId: vi.fn().mockResolvedValue([]),
    } as unknown as CaseParticipantCompanyRepository;
    const handler = createHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(childCase) } as unknown as CaseRepository,
      participantCompanyRepo,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(clientProfile) } as unknown as UserRepository,
    });

    const res = await handler(makeEvent("client-user", "CHILD-1"));

    expect(res.statusCode).toBe(200);
    expect(findByCaseAndCompany).toHaveBeenNthCalledWith(1, "CHILD-1", "CLIENT-COMP");
    expect(findByCaseAndCompany).toHaveBeenNthCalledWith(2, "PROJ-1", "CLIENT-COMP");
  });
});

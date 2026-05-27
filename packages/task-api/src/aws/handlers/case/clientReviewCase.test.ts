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
import { CaseAssignmentRepository } from "@/repositories/caseAssignmentRepository";
import { CaseVisibilityRepository } from "@/repositories/caseVisibilityRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./clientReviewCase";

const makeEvent = (sub: string | null, caseId: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: sub ? { authorizer: { claims: { sub } } } : {},
    pathParameters: { id: caseId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const clientProfile = {
  User: "client-user",
  companyId: "CLIENT-COMP",
  divisionId: "DIV-2",
  departmentId: "DEPT-2",
  teamId: "TEAM-2",
  role: UserRole.USER,
};

const reviewRequestedProject = {
  caseId: "PROJ-1",
  companyId: "OWNER-COMP",
  creatorId: "owner-user",
  ownerType: CaseOwnerType.USER,
  ownerId: "owner-user",
  deliveryType: CaseDeliveryType.DIRECT,
  caseType: CaseType.PROJECT,
  status: CaseStatus.REVIEW_REQUESTED,
  title: "Test Project",
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

const activeClientRecord = {
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

const makeDeps = (overrides?: Partial<Parameters<typeof createHandler>[0]>) =>
  createHandler({
    caseRepo: {
      findById: vi.fn().mockResolvedValue(reviewRequestedProject),
      saveWithAccessRecords: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseRepository,
    participantCompanyRepo: {
      findByCaseAndCompany: vi.fn().mockResolvedValue(activeClientRecord),
    } as unknown as CaseParticipantCompanyRepository,
    caseHistoryRepo: {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseHistoryRepository,
    assignmentRepo: {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseAssignmentRepository,
    visibilityRepo: {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CaseVisibilityRepository,
    userRepo: {
      findByUserId: vi.fn().mockResolvedValue(clientProfile),
    } as unknown as UserRepository,
    ...overrides,
  });

describe("clientReviewCase", () => {
  it("JWT がない場合は 401", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent(null, "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(401);
  });

  it("APPROVE で 200 かつ status が COMPLETED に変わる", async () => {
    const saveWithAccessRecords = vi.fn().mockResolvedValue(undefined);
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue(reviewRequestedProject),
        saveWithAccessRecords,
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(200);
    expect(saveWithAccessRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: CaseStatus.COMPLETED }),
    );
  });

  it("REJECT で 200 かつ status が REOPENED に変わる", async () => {
    const saveWithAccessRecords = vi.fn().mockResolvedValue(undefined);
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue(reviewRequestedProject),
        saveWithAccessRecords,
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "REJECT", reason: "品質不足" }));
    expect(res.statusCode).toBe(200);
    expect(saveWithAccessRecords).toHaveBeenCalledWith(
      expect.objectContaining({ status: CaseStatus.REOPENED }),
    );
  });

  it("REJECT で reason がない場合は 400", async () => {
    const handler = makeDeps();
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "REJECT" }));
    expect(res.statusCode).toBe(400);
  });

  it("case status が REVIEW_REQUESTED でない場合は 400", async () => {
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({ ...reviewRequestedProject, status: CaseStatus.IN_PROGRESS }),
        saveWithAccessRecords: vi.fn(),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(400);
  });

  it("PROJECT 以外の case は 400", async () => {
    const handler = makeDeps({
      caseRepo: {
        findById: vi.fn().mockResolvedValue({ ...reviewRequestedProject, caseType: CaseType.STANDARD }),
        saveWithAccessRecords: vi.fn(),
      } as unknown as CaseRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(400);
  });

  it("participantType が COLLABORATOR の場合は 403", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          ...activeClientRecord,
          participantType: CaseParticipantType.COLLABORATOR,
        }),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("別テナントの CLIENT は 403 (owner company と同じ companyId)", async () => {
    const handler = makeDeps({
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue({ ...clientProfile, companyId: "OWNER-COMP" }),
      } as unknown as UserRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("participant record がない場合は 403", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(undefined),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(403);
  });

  it("status が INVITED の CLIENT は 403", async () => {
    const handler = makeDeps({
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue({
          ...activeClientRecord,
          status: CaseParticipantCompanyStatus.INVITED,
        }),
      } as unknown as CaseParticipantCompanyRepository,
    });
    const res = await handler(makeEvent("client-user", "PROJ-1", { action: "APPROVE" }));
    expect(res.statusCode).toBe(403);
  });
});

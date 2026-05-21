import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseCommentRepository } from "@/repositories/caseCommentRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { createHandler } from "./getCaseComments";

const makeParticipantCompanyRepo = () =>
  ({ findByCaseAndCompany: vi.fn().mockResolvedValue(undefined) }) as unknown as CaseParticipantCompanyRepository;

const makeEvent = (params: { sub?: string; id?: string }): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub
      ? { authorizer: { claims: { sub: params.sub } } }
      : {},
    pathParameters: params.id ? { id: params.id } : null,
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const mockProfile = {
  pk: "User",
  sk: "Team#TEAM-1#User#user-1",
  at: "2026-01-01T00:00:00.000Z",
  User: "user-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "user@example.com",
  role: UserRole.TEAM_ADMIN,
  name: "Test User",
};

const baseCase = {
  caseId: "CASE-1",
  title: "Test Case",
  description: "Test description",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.DIRECT,
  ownerType: CaseOwnerType.USER,
  ownerId: "user-1",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  creatorId: "user-1",
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockComment = {
  commentId: "CMT-1",
  caseId: "CASE-1",
  companyId: "COMP-1",
  authorId: "user-1",
  content: "Test comment",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  comments?: unknown[];
}) => {
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const caseCommentRepo = {
    findByCaseId: vi.fn().mockResolvedValue(overrides.comments ?? []),
  } as unknown as CaseCommentRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() };
};

describe("getCaseComments", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ id: "CASE-1" }));
    expect(response.statusCode).toBe(401);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT" }));
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("アクセス権限がない場合は 403", async () => {
    const inaccessibleCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerId: "other-user",
      targetScope: CaseTargetScope.USER,
      targetScopeId: "other-user",
    };
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: inaccessibleCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(403);
  });

  it("creator は comment 一覧を取得できる", async () => {
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      comments: [mockComment],
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown[];
    expect(body).toHaveLength(1);
  });

  it("TEAM target member は comment 一覧を取得できる", async () => {
    const teamCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerId: "other-user",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: teamCase,
      profileResult: mockProfile,
      comments: [],
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
  });

  it("comment が存在しない場合は空配列を返す", async () => {
    const { caseRepo, caseCommentRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
      comments: [],
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, userRepo, participantCompanyRepo: makeParticipantCompanyRepo() });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as unknown[];
    expect(body).toHaveLength(0);
  });
});

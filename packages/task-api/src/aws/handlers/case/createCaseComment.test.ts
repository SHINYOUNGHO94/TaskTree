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
import { CaseCommentRepository } from "@/repositories/caseCommentRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./createCaseComment";

const makeEvent = (params: {
  sub?: string;
  id?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub
      ? { authorizer: { claims: { sub: params.sub } } }
      : {},
    pathParameters: params.id ? { id: params.id } : null,
    body:
      params.rawBody !== undefined
        ? params.rawBody
        : params.body !== undefined
          ? JSON.stringify(params.body)
          : null,
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

const activeParticipant = {
  participantCompanyId: "COMP-1",
  caseId: "CASE-1",
  ownerCompanyId: "COMP-OWNER",
  companyId: "COMP-1",
  companyName: "Participant Company",
  status: CaseParticipantCompanyStatus.ACTIVE,
  invitedBy: "owner-user",
  reviewedBy: "admin-user",
  reviewedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const makeMockRepos = (overrides: {
  caseResult?: unknown;
  profileResult?: unknown;
  participantResult?: unknown;
  saveMock?: ReturnType<typeof vi.fn>;
}) => {
  const save = overrides.saveMock ?? vi.fn().mockResolvedValue(undefined);
  const caseRepo = {
    findById: vi.fn().mockResolvedValue(overrides.caseResult),
  } as unknown as CaseRepository;
  const caseCommentRepo = { save } as unknown as CaseCommentRepository;
  const participantCompanyRepo = {
    findByCaseAndCompany: vi.fn().mockResolvedValue(overrides.participantResult),
  } as unknown as CaseParticipantCompanyRepository;
  const userRepo = {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult),
  } as unknown as UserRepository;
  return { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo };
};

describe("createCaseComment", () => {
  it("JWT がない場合は 401", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(makeEvent({ id: "CASE-1", body: { content: "Hello" } }));
    expect(response.statusCode).toBe(401);
  });

  it("body がない場合は 400", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(makeEvent({ sub: "user-1", id: "CASE-1" }));
    expect(response.statusCode).toBe(400);
  });

  it("不正な JSON の場合は 400", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", rawBody: "not-json" }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("content が空文字の場合は 400", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "  " } }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("content がない場合は 400", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: {} }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("content 以外の field がある場合は 400", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({});
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({
        sub: "user-1",
        id: "CASE-1",
        body: { content: "Hello", authorId: "spoofed-user" },
      }),
    );
    expect(response.statusCode).toBe(400);
  });

  it("user profile が存在しない場合は 500", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: undefined,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(500);
  });

  it("case が存在しない場合は 404", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: undefined,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-NONEXISTENT", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(404);
  });

  it("別会社の case は 403", async () => {
    const otherCompanyCase = { ...baseCase, companyId: "COMP-OTHER" };
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: otherCompanyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
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
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: inaccessibleCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("requiredRole を満たさない場合は 403", async () => {
    const adminOnlyCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerId: "other-user",
      requiredRole: UserRole.COMPANY_ADMIN,
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: adminOnlyCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(403);
  });

  it("creator は comment を作成できる", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { commentId: string };
    expect(typeof body.commentId).toBe("string");
    expect(caseCommentRepo.save).toHaveBeenCalledOnce();
  });

  it("TEAM target member は comment を作成できる", async () => {
    const teamCase = {
      ...baseCase,
      creatorId: "other-user",
      ownerId: "other-user",
      targetScope: CaseTargetScope.TEAM,
      targetScopeId: "TEAM-1",
    };
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: teamCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("ACTIVE participant company user は OPEN case に comment を作成できる", async () => {
    const externalOpenCase = {
      ...baseCase,
      companyId: "COMP-OWNER",
      deliveryType: CaseDeliveryType.OPEN,
      creatorId: "owner-user",
      ownerId: "owner-user",
    };
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: externalOpenCase,
      profileResult: mockProfile,
      participantResult: activeParticipant,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    const response = await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    expect(response.statusCode).toBe(201);
  });

  it("作成された comment には authorId と companyId が含まれる", async () => {
    const { caseRepo, caseCommentRepo, participantCompanyRepo, userRepo } = makeMockRepos({
      caseResult: baseCase,
      profileResult: mockProfile,
    });
    const handler = createHandler({ caseRepo, caseCommentRepo, participantCompanyRepo, userRepo });
    await handler(
      makeEvent({ sub: "user-1", id: "CASE-1", body: { content: "Hello" } }),
    );
    const savedArg = (caseCommentRepo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      authorId: string;
      companyId: string;
      content: string;
    };
    expect(savedArg.authorId).toBe("user-1");
    expect(savedArg.companyId).toBe("COMP-1");
    expect(savedArg.content).toBe("Hello");
  });
});

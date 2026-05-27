import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { createHandler } from "./getReadPresignedUrl";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

const makeEvent = (params: {
  sub?: string;
  key?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub ? { authorizer: { claims: { sub: params.sub } } } : {},
    queryStringParameters: params.key ? { key: params.key } : null,
  }) as unknown as APIGatewayProxyEvent;

const ownerCase = {
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  creatorId: "owner-user",
  ownerType: CaseOwnerType.USER,
  ownerId: "owner-user",
  title: "Case",
  description: "Description",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.OPEN,
  targetScope: CaseTargetScope.USER,
  targetScopeId: "owner-user",
  requiredRole: UserRole.USER,
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const ownerProfile = {
  User: "owner-user",
  companyId: "OWNER-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "owner@example.com",
  role: UserRole.USER,
  name: "Owner",
};

const participantProfile = {
  ...ownerProfile,
  User: "participant-user",
  companyId: "EXT-COMP",
  email: "participant@example.com",
};

const activeParticipant = {
  participantCompanyId: "EXT-COMP",
  caseId: "CASE-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "EXT-COMP",
  companyName: "External Company",
  status: CaseParticipantCompanyStatus.ACTIVE,
  invitedBy: "owner-user",
  reviewedBy: "ext-admin",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const objectKey = "OWNER-COMP/cases/CASE-1/images/image.png";

const makeDeps = (overrides: {
  profileResult?: unknown;
  caseResult?: unknown;
  participantResult?: unknown;
}) => ({
  caseRepo: {
    findById: vi.fn().mockResolvedValue(overrides.caseResult ?? ownerCase),
  } as unknown as CaseRepository,
  participantCompanyRepo: {
    findByCaseAndCompany: vi.fn().mockResolvedValue(overrides.participantResult),
  } as unknown as CaseParticipantCompanyRepository,
  userRepo: {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult ?? ownerProfile),
  } as unknown as UserRepository,
  s3Client: {} as S3Client,
  bucketName: "case-images",
});

describe("getReadPresignedUrl", () => {
  beforeEach(() => {
    vi.mocked(getSignedUrl).mockReset();
    vi.mocked(getSignedUrl).mockResolvedValue("https://bucket.example/read");
  });

  it("same-company authorized user can get a read URL", async () => {
    const handler = createHandler(makeDeps({}));
    const response = await handler(makeEvent({ sub: "owner-user", key: objectKey }));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ readUrl: "https://bucket.example/read" });
    expect(getSignedUrl).toHaveBeenCalledOnce();
  });

  it("ACTIVE participant can read image for OPEN case", async () => {
    const handler = createHandler(makeDeps({
      profileResult: participantProfile,
      participantResult: activeParticipant,
    }));
    const response = await handler(makeEvent({ sub: "participant-user", key: objectKey }));

    expect(response.statusCode).toBe(200);
    expect(getSignedUrl).toHaveBeenCalledOnce();
  });

  it("ACTIVE participant cannot read image for DIRECT case", async () => {
    const handler = createHandler(makeDeps({
      profileResult: participantProfile,
      caseResult: {
        ...ownerCase,
        deliveryType: CaseDeliveryType.DIRECT,
      },
      participantResult: activeParticipant,
    }));
    const response = await handler(makeEvent({ sub: "participant-user", key: objectKey }));

    expect(response.statusCode).toBe(403);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects object key with a different owner company", async () => {
    const handler = createHandler(makeDeps({}));
    const response = await handler(
      makeEvent({ sub: "owner-user", key: "OTHER-COMP/cases/CASE-1/images/image.png" }),
    );

    expect(response.statusCode).toBe(403);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects same-company user outside case permission", async () => {
    const handler = createHandler(makeDeps({
      profileResult: {
        ...ownerProfile,
        User: "reader-user",
      },
      caseResult: {
        ...ownerCase,
        creatorId: "owner-user",
        ownerId: "owner-user",
        targetScope: CaseTargetScope.USER,
        targetScopeId: "other-user",
      },
    }));
    const response = await handler(makeEvent({ sub: "reader-user", key: objectKey }));

    expect(response.statusCode).toBe(403);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});

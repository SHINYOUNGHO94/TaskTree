import { APIGatewayProxyEvent } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CaseDeliveryType,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler } from "./getUploadPresignedUrl";

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn(),
}));

const makeEvent = (params: {
  sub?: string;
  body?: unknown;
  rawBody?: string;
}): APIGatewayProxyEvent =>
  ({
    requestContext: params.sub ? { authorizer: { claims: { sub: params.sub } } } : {},
    body:
      params.rawBody !== undefined
        ? params.rawBody
        : params.body !== undefined
          ? JSON.stringify(params.body)
          : null,
  }) as unknown as APIGatewayProxyEvent;

const profile = {
  User: "user-1",
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  email: "user@example.com",
  role: UserRole.USER,
  name: "Test User",
};

const baseCase = {
  caseId: "CASE-1",
  companyId: "COMP-1",
  creatorId: "user-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "user-1",
  title: "Case",
  description: "Description",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.OPEN,
  targetScope: CaseTargetScope.USER,
  targetScopeId: "user-1",
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

const makeDeps = (overrides: {
  profileResult?: unknown;
  caseResult?: unknown;
}) => ({
  caseRepo: {
    findById: vi.fn().mockResolvedValue(overrides.caseResult ?? baseCase),
  } as unknown as CaseRepository,
  userRepo: {
    findByUserId: vi.fn().mockResolvedValue(overrides.profileResult ?? profile),
  } as unknown as UserRepository,
  s3Client: {} as S3Client,
  bucketName: "case-images",
});

describe("getUploadPresignedUrl", () => {
  beforeEach(() => {
    vi.mocked(createPresignedPost).mockReset();
    vi.mocked(createPresignedPost).mockResolvedValue({
      url: "https://bucket.example/upload",
      fields: { key: "value" },
    });
  });

  it("creator can create a presigned image upload URL", async () => {
    const handler = createHandler(makeDeps({}));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        body: {
          caseId: "CASE-1",
          contentType: "image/png",
          fileSize: 1024,
        },
      }),
    );

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { objectKey: string; url: string };
    expect(body.url).toBe("https://bucket.example/upload");
    expect(body.objectKey).toMatch(/^COMP-1\/cases\/CASE-1\/images\/.+\.png$/);
    expect(createPresignedPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        Bucket: "case-images",
        Conditions: expect.arrayContaining([["content-length-range", 1, 5 * 1024 * 1024]]),
        Fields: { "Content-Type": "image/png" },
      }),
    );
  });

  it("rejects unsupported content type", async () => {
    const handler = createHandler(makeDeps({}));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        body: {
          caseId: "CASE-1",
          contentType: "image/gif",
          fileSize: 1024,
        },
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(createPresignedPost).not.toHaveBeenCalled();
  });

  it("rejects files larger than 5MB", async () => {
    const handler = createHandler(makeDeps({}));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        body: {
          caseId: "CASE-1",
          contentType: "image/png",
          fileSize: 5 * 1024 * 1024 + 1,
        },
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(createPresignedPost).not.toHaveBeenCalled();
  });

  it("rejects cross-company case upload", async () => {
    const handler = createHandler(makeDeps({
      caseResult: {
        ...baseCase,
        companyId: "OTHER-COMP",
      },
    }));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        body: {
          caseId: "CASE-1",
          contentType: "image/png",
          fileSize: 1024,
        },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(createPresignedPost).not.toHaveBeenCalled();
  });

  it("rejects same-company reader who is not creator or USER owner", async () => {
    const handler = createHandler(makeDeps({
      caseResult: {
        ...baseCase,
        creatorId: "other-user",
        ownerId: "other-user",
      },
    }));
    const response = await handler(
      makeEvent({
        sub: "user-1",
        body: {
          caseId: "CASE-1",
          contentType: "image/png",
          fileSize: 1024,
        },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(createPresignedPost).not.toHaveBeenCalled();
  });
});

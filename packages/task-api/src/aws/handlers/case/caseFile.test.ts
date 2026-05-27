import { APIGatewayProxyEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn().mockResolvedValue({
    url: "https://s3.example.com",
    fields: { key: "OWNER-COMP/cases/CASE-1/files/test-id", Policy: "mock-policy" },
  }),
}));
import {
  CaseDeliveryType,
  CaseHistoryAction,
  CaseOwnerType,
  CaseParticipantCompanyStatus,
  CaseParticipantType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { S3Client } from "@aws-sdk/client-s3";
import { CaseRepository } from "@/repositories/caseRepository";
import { CaseFileRepository } from "@/repositories/caseFileRepository";
import { CaseParticipantCompanyRepository } from "@/repositories/caseParticipantCompanyRepository";
import { CaseHistoryRepository } from "@/repositories/caseHistoryRepository";
import { UserRepository } from "@/repositories/userRepository";
import { createHandler as createGetFilesHandler } from "./getCaseFiles";
import { createHandler as createUploadUrlHandler } from "./getCaseFileUploadUrl";
import { createHandler as createConfirmHandler } from "./confirmCaseFileUpload";
import { createHandler as createDownloadUrlHandler } from "./getCaseFileDownloadUrl";
import { createHandler as createDeleteHandler } from "./deleteCaseFile";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeGetEvent = (sub: string, caseId: string): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId },
  }) as unknown as APIGatewayProxyEvent;

const makeFileEvent = (
  sub: string,
  caseId: string,
  fileId: string,
  suffix: string,
): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId, fileId },
    body: null,
  }) as unknown as APIGatewayProxyEvent;

const makeBodyEvent = (sub: string, caseId: string, body: unknown): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const makeFileBodyEvent = (
  sub: string,
  caseId: string,
  fileId: string,
  body: unknown,
): APIGatewayProxyEvent =>
  ({
    requestContext: { authorizer: { claims: { sub } } },
    pathParameters: { id: caseId, fileId },
    body: JSON.stringify(body),
  }) as unknown as APIGatewayProxyEvent;

const ownerCase = {
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  creatorId: "creator-1",
  ownerType: CaseOwnerType.USER,
  ownerId: "creator-1",
  deliveryType: CaseDeliveryType.OPEN,
  caseType: CaseType.STANDARD,
  status: CaseStatus.IN_PROGRESS,
  title: "Test Case",
  description: "desc",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  targetScope: CaseTargetScope.COMPANY,
  targetScopeId: "OWNER-COMP",
  requiredRole: UserRole.USER,
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const creatorProfile = {
  userId: "creator-1",
  companyId: "OWNER-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.USER,
  name: "Creator",
  email: "creator@example.com",
};

const otherProfile = {
  userId: "other-1",
  companyId: "OWNER-COMP",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  role: UserRole.USER,
  name: "Other",
  email: "other@example.com",
};

const extProfile = {
  userId: "ext-user-1",
  companyId: "EXT-COMP",
  divisionId: "DIV-2",
  departmentId: "DEPT-2",
  teamId: "TEAM-2",
  role: UserRole.USER,
  name: "External",
  email: "ext@example.com",
};

const activeCollaboratorRecord = {
  participantCompanyId: "EXT-COMP",
  caseId: "CASE-1",
  ownerCompanyId: "OWNER-COMP",
  companyId: "EXT-COMP",
  companyName: "External Co",
  status: CaseParticipantCompanyStatus.ACTIVE,
  participantType: CaseParticipantType.COLLABORATOR,
  invitedBy: "creator-1",
  reviewedBy: "ext-user-1",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const clientRecord = {
  ...activeCollaboratorRecord,
  participantType: CaseParticipantType.CLIENT,
};

const existingFile = {
  fileId: "FILE-1",
  caseId: "CASE-1",
  companyId: "OWNER-COMP",
  uploaderCompanyId: "OWNER-COMP",
  uploadedBy: "creator-1",
  fileName: "test.pdf",
  contentType: "application/pdf",
  fileSize: 1024,
  objectKey: "OWNER-COMP/cases/CASE-1/files/FILE-1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockS3Client = {
  send: vi.fn(),
} as unknown as S3Client;

// ── getCaseFiles ──────────────────────────────────────────────────────────────

describe("getCaseFiles", () => {
  const makeHandler = (overrides: {
    findByCaseAndCompany?: ReturnType<typeof vi.fn>;
    findByCaseId?: ReturnType<typeof vi.fn>;
    userRepo?: Partial<{ findByUserId: ReturnType<typeof vi.fn> }>;
    caseRepo?: Partial<{ findById: ReturnType<typeof vi.fn> }>;
  } = {}) => {
    const caseFileRepo = {
      findByCaseId: overrides.findByCaseId ?? vi.fn().mockResolvedValue([existingFile]),
    } as unknown as CaseFileRepository;
    const participantCompanyRepo = {
      findByCaseAndCompany: overrides.findByCaseAndCompany ?? vi.fn().mockResolvedValue(null),
    } as unknown as CaseParticipantCompanyRepository;
    return createGetFilesHandler({
      caseRepo: {
        findById: overrides.caseRepo?.findById ?? vi.fn().mockResolvedValue(ownerCase),
      } as unknown as CaseRepository,
      caseFileRepo,
      participantCompanyRepo,
      userRepo: {
        findByUserId: overrides.userRepo?.findByUserId ?? vi.fn().mockResolvedValue(creatorProfile),
      } as unknown as UserRepository,
    });
  };

  it("401 — no auth", async () => {
    const handler = makeHandler();
    const res = await handler({ requestContext: {} } as unknown as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(401);
  });

  it("404 — case not found", async () => {
    const handler = makeHandler({ caseRepo: { findById: vi.fn().mockResolvedValue(null) } });
    const res = await handler(makeGetEvent("creator-1", "CASE-X"));
    expect(res.statusCode).toBe(404);
  });

  it("403 — external company without participant record", async () => {
    const handler = makeHandler({
      userRepo: { findByUserId: vi.fn().mockResolvedValue(extProfile) },
      findByCaseAndCompany: vi.fn().mockResolvedValue(null),
    });
    const res = await handler(makeGetEvent("ext-user-1", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });

  it("200 — same-company creator gets file list (objectKey excluded from response)", async () => {
    const handler = makeHandler();
    const res = await handler(makeGetEvent("creator-1", "CASE-1"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0].fileId).toBe("FILE-1");
    expect(body[0].objectKey).toBeUndefined();
  });

  it("200 — ACTIVE COLLABORATOR participant can list files", async () => {
    const handler = makeHandler({
      userRepo: { findByUserId: vi.fn().mockResolvedValue(extProfile) },
      findByCaseAndCompany: vi.fn().mockResolvedValue(activeCollaboratorRecord),
    });
    const res = await handler(makeGetEvent("ext-user-1", "CASE-1"));
    expect(res.statusCode).toBe(200);
  });

  it("200 — ACTIVE CLIENT participant can list files", async () => {
    const handler = makeHandler({
      userRepo: { findByUserId: vi.fn().mockResolvedValue(extProfile) },
      findByCaseAndCompany: vi.fn().mockResolvedValue(clientRecord),
    });
    const res = await handler(makeGetEvent("ext-user-1", "CASE-1"));
    expect(res.statusCode).toBe(200);
  });

  it("403 — INVITED (not ACTIVE) participant is denied", async () => {
    const handler = makeHandler({
      userRepo: { findByUserId: vi.fn().mockResolvedValue(extProfile) },
      findByCaseAndCompany: vi.fn().mockResolvedValue({
        ...activeCollaboratorRecord,
        status: CaseParticipantCompanyStatus.INVITED,
      }),
    });
    const res = await handler(makeGetEvent("ext-user-1", "CASE-1"));
    expect(res.statusCode).toBe(403);
  });
});

// ── getCaseFileUploadUrl ──────────────────────────────────────────────────────

describe("getCaseFileUploadUrl", () => {
  const validBody = { fileName: "test.pdf", contentType: "application/pdf", fileSize: 1024 };

  const makeHandler = (overrides: {
    userProfile?: typeof creatorProfile | typeof otherProfile | typeof extProfile;
  } = {}) =>
    createUploadUrlHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue(overrides.userProfile ?? creatorProfile),
      } as unknown as UserRepository,
      s3Client: mockS3Client,
      bucketName: "test-bucket",
    });

  it("401 — no auth", async () => {
    const handler = makeHandler();
    const res = await handler({ requestContext: {} } as unknown as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(401);
  });

  it("400 — invalid contentType", async () => {
    const handler = makeHandler();
    const res = await handler(makeBodyEvent("creator-1", "CASE-1", {
      ...validBody,
      contentType: "application/x-executable",
    }));
    expect(res.statusCode).toBe(400);
  });

  it("400 — fileSize exceeds 20MB", async () => {
    const handler = makeHandler();
    const res = await handler(makeBodyEvent("creator-1", "CASE-1", {
      ...validBody,
      fileSize: 21 * 1024 * 1024,
    }));
    expect(res.statusCode).toBe(400);
  });

  it("403 — external company cannot upload", async () => {
    const handler = makeHandler({ userProfile: extProfile });
    const res = await handler(makeBodyEvent("ext-user-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(403);
  });

  it("403 — same-company non-creator/owner cannot upload", async () => {
    const handler = makeHandler({ userProfile: otherProfile });
    const res = await handler(makeBodyEvent("other-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(403);
  });

  it("200 — creator gets presigned URL with fileId (no objectKey)", async () => {
    const handler = makeHandler();
    const res = await handler(makeBodyEvent("creator-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.fileId).toBeDefined();
    expect(body.url).toBeDefined();
    expect(body.fields).toBeDefined();
    expect(body.objectKey).toBeUndefined();
  });
});

// ── confirmCaseFileUpload ─────────────────────────────────────────────────────

describe("confirmCaseFileUpload", () => {
  const validBody = {
    fileId: "FILE-NEW",
    fileName: "report.pdf",
    contentType: "application/pdf",
    fileSize: 2048,
  };

  const makeHandler = (
    headObjectResult: "success" | "fail" = "success",
    userProfile = creatorProfile,
  ) => {
    const s3 = {
      send: vi.fn().mockImplementation(() =>
        headObjectResult === "success"
          ? Promise.resolve({ ContentLength: 2048 })
          : Promise.reject(new Error("NoSuchKey")),
      ),
    } as unknown as S3Client;

    return createConfirmHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseFileRepository,
      caseHistoryRepo: { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseHistoryRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(userProfile) } as unknown as UserRepository,
      s3Client: s3,
      bucketName: "test-bucket",
    });
  };

  it("401 — no auth", async () => {
    const handler = makeHandler();
    const res = await handler({ requestContext: {} } as unknown as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(401);
  });

  it("400 — S3 object not found (file not uploaded)", async () => {
    const handler = makeHandler("fail");
    const res = await handler(makeBodyEvent("creator-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(400);
  });

  it("403 — external company cannot confirm upload", async () => {
    const handler = makeHandler("success", extProfile);
    const res = await handler(makeBodyEvent("ext-user-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(403);
  });

  it("403 — non-creator/owner cannot confirm upload", async () => {
    const handler = makeHandler("success", otherProfile);
    const res = await handler(makeBodyEvent("other-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(403);
  });

  it("201 — creator confirms upload, saves record, writes history, objectKey not in response", async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const historyFn = vi.fn().mockResolvedValue(undefined);
    const s3 = {
      send: vi.fn().mockResolvedValue({ ContentLength: 2048 }),
    } as unknown as S3Client;
    const handler = createConfirmHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: { save: saveFn } as unknown as CaseFileRepository,
      caseHistoryRepo: { save: historyFn } as unknown as CaseHistoryRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(creatorProfile) } as unknown as UserRepository,
      s3Client: s3,
      bucketName: "test-bucket",
    });
    const res = await handler(makeBodyEvent("creator-1", "CASE-1", validBody));
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.fileId).toBe("FILE-NEW");
    expect(body.objectKey).toBeUndefined();
    expect(saveFn).toHaveBeenCalledOnce();
    expect(saveFn.mock.calls[0][0]).toMatchObject({
      fileId: "FILE-NEW",
      caseId: "CASE-1",
      companyId: "OWNER-COMP",
      objectKey: "OWNER-COMP/cases/CASE-1/files/FILE-NEW",
    });
    expect(historyFn).toHaveBeenCalledWith(expect.objectContaining({
      action: CaseHistoryAction.FILE_UPLOADED,
    }));
  });
});

// ── getCaseFileDownloadUrl ────────────────────────────────────────────────────

describe("getCaseFileDownloadUrl", () => {
  const makeHandler = (
    userProfile = creatorProfile,
    participantRecord: unknown = null,
    fileRecord: unknown = existingFile,
  ) =>
    createDownloadUrlHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: {
        findByFileId: vi.fn().mockResolvedValue(fileRecord),
      } as unknown as CaseFileRepository,
      participantCompanyRepo: {
        findByCaseAndCompany: vi.fn().mockResolvedValue(participantRecord),
      } as unknown as CaseParticipantCompanyRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(userProfile) } as unknown as UserRepository,
      s3Client: {
        send: vi.fn().mockResolvedValue({}),
      } as unknown as S3Client,
      bucketName: "test-bucket",
    });

  it("401 — no auth", async () => {
    const handler = makeHandler();
    const res = await handler({ requestContext: {} } as unknown as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(401);
  });

  it("404 — file not found", async () => {
    const handler = makeHandler(creatorProfile, null, null);
    const res = await handler(makeFileEvent("creator-1", "CASE-1", "FILE-NONE", "download-url"));
    expect(res.statusCode).toBe(404);
  });

  it("403 — external company without participant record denied", async () => {
    const handler = makeHandler(extProfile, null);
    const res = await handler(makeFileEvent("ext-user-1", "CASE-1", "FILE-1", "download-url"));
    expect(res.statusCode).toBe(403);
  });

  it("200 — same-company user gets download URL", async () => {
    const handler = makeHandler();
    const res = await handler(makeFileEvent("creator-1", "CASE-1", "FILE-1", "download-url"));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.downloadUrl).toBeDefined();
  });

  it("200 — ACTIVE CLIENT participant can download", async () => {
    const handler = makeHandler(extProfile, clientRecord);
    const res = await handler(makeFileEvent("ext-user-1", "CASE-1", "FILE-1", "download-url"));
    expect(res.statusCode).toBe(200);
  });
});

// ── deleteCaseFile ────────────────────────────────────────────────────────────

describe("deleteCaseFile", () => {
  const makeHandler = (overrides: {
    userProfile?: typeof creatorProfile | typeof otherProfile | typeof extProfile;
    fileRecord?: typeof existingFile | null;
    s3Fail?: boolean;
  } = {}) => {
    const s3 = {
      send: vi.fn().mockImplementation(() =>
        overrides.s3Fail ? Promise.reject(new Error("S3 error")) : Promise.resolve({}),
      ),
    } as unknown as S3Client;
    return createDeleteHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: {
        findByFileId: vi.fn().mockResolvedValue(overrides.fileRecord !== undefined ? overrides.fileRecord : existingFile),
        deleteByFileId: vi.fn().mockResolvedValue(undefined),
      } as unknown as CaseFileRepository,
      caseHistoryRepo: { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseHistoryRepository,
      userRepo: {
        findByUserId: vi.fn().mockResolvedValue(overrides.userProfile ?? creatorProfile),
      } as unknown as UserRepository,
      s3Client: s3,
      bucketName: "test-bucket",
    });
  };

  it("401 — no auth", async () => {
    const handler = makeHandler();
    const res = await handler({ requestContext: {} } as unknown as APIGatewayProxyEvent);
    expect(res.statusCode).toBe(401);
  });

  it("404 — file not found", async () => {
    const handler = makeHandler({ fileRecord: null });
    const res = await handler(makeFileEvent("creator-1", "CASE-1", "FILE-NONE", ""));
    expect(res.statusCode).toBe(404);
  });

  it("403 — external company cannot delete", async () => {
    const handler = makeHandler({ userProfile: extProfile });
    const res = await handler(makeFileEvent("ext-user-1", "CASE-1", "FILE-1", ""));
    expect(res.statusCode).toBe(403);
  });

  it("403 — same-company non-creator/owner cannot delete", async () => {
    const handler = makeHandler({ userProfile: otherProfile });
    const res = await handler(makeFileEvent("other-1", "CASE-1", "FILE-1", ""));
    expect(res.statusCode).toBe(403);
  });

  it("500 — S3 delete failure keeps DynamoDB record", async () => {
    const deleteByFileId = vi.fn();
    const s3 = {
      send: vi.fn().mockRejectedValue(new Error("S3 error")),
    } as unknown as S3Client;
    const handler = createDeleteHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: {
        findByFileId: vi.fn().mockResolvedValue(existingFile),
        deleteByFileId,
      } as unknown as CaseFileRepository,
      caseHistoryRepo: { save: vi.fn().mockResolvedValue(undefined) } as unknown as CaseHistoryRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(creatorProfile) } as unknown as UserRepository,
      s3Client: s3,
      bucketName: "test-bucket",
    });
    const res = await handler(makeFileEvent("creator-1", "CASE-1", "FILE-1", ""));
    expect(res.statusCode).toBe(500);
    expect(deleteByFileId).not.toHaveBeenCalled();
  });

  it("200 — creator deletes file, S3 then DynamoDB, history recorded", async () => {
    const deleteByFileId = vi.fn().mockResolvedValue(undefined);
    const historyFn = vi.fn().mockResolvedValue(undefined);
    const s3 = { send: vi.fn().mockResolvedValue({}) } as unknown as S3Client;
    const handler = createDeleteHandler({
      caseRepo: { findById: vi.fn().mockResolvedValue(ownerCase) } as unknown as CaseRepository,
      caseFileRepo: {
        findByFileId: vi.fn().mockResolvedValue(existingFile),
        deleteByFileId,
      } as unknown as CaseFileRepository,
      caseHistoryRepo: { save: historyFn } as unknown as CaseHistoryRepository,
      userRepo: { findByUserId: vi.fn().mockResolvedValue(creatorProfile) } as unknown as UserRepository,
      s3Client: s3,
      bucketName: "test-bucket",
    });
    const res = await handler(makeFileEvent("creator-1", "CASE-1", "FILE-1", ""));
    expect(res.statusCode).toBe(200);
    expect(deleteByFileId).toHaveBeenCalledWith("CASE-1", "FILE-1");
    expect(historyFn).toHaveBeenCalledWith(expect.objectContaining({
      action: CaseHistoryAction.FILE_DELETED,
    }));
    const body = JSON.parse(res.body);
    expect(body.fileId).toBe("FILE-1");
  });
});

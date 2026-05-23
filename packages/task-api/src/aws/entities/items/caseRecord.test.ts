import { describe, expect, it } from "vitest";
import {
  CaseDeliveryType,
  CaseDetail,
  CaseOwnerType,
  CaseStatus,
  CaseTargetScope,
  CaseType,
  UserRole,
} from "@task/core";
import { CaseRecord } from "./caseRecord";

const baseDetail: CaseDetail = {
  caseId: "CASE-1",
  title: "Test Case",
  description: "desc",
  caseType: CaseType.REQUEST,
  status: CaseStatus.WAITING,
  deliveryType: CaseDeliveryType.DIRECT,
  ownerType: CaseOwnerType.USER,
  ownerId: "USER-1",
  targetScope: CaseTargetScope.TEAM,
  targetScopeId: "TEAM-1",
  requiredRole: UserRole.USER,
  companyId: "COMP-1",
  divisionId: "DIV-1",
  departmentId: "DEPT-1",
  teamId: "TEAM-1",
  creatorId: "USER-1",
  projectId: null,
  parentCaseId: null,
  dueDate: null,
  createdAt: "2026-05-21T00:00:00.000Z",
  updatedAt: "2026-05-21T00:00:00.000Z",
};

describe("CaseRecord", () => {
  describe("fromDetail", () => {
    it("sets correct pk and sk", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      expect(record.pk).toBe("Case");
      expect(record.sk).toBe("Case#CASE-1");
    });

    it("sets caseId and caseSortKey", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      expect(record.caseId).toBe("CASE-1");
      expect(record.caseSortKey).toBe("Meta#Case#CASE-1");
    });

    it("sets assignee and visibility keys for GSI queries", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      expect(record.assigneeKey).toBe("USER#USER-1");
      expect(record.assigneeSortKey).toBe("Case#WAITING#NONE#CASE-1");
      expect(record.visibilityKey).toBe("TEAM#TEAM-1");
      expect(record.visibilitySortKey).toBe("Role#2#Case#WAITING#2026-05-21T00:00:00.000Z#CASE-1");
    });

    it("maps title to name and timestamps", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      expect(record.name).toBe("Test Case");
      expect(record.at).toBe("2026-05-21T00:00:00.000Z");
      expect(record.update_at).toBe("2026-05-21T00:00:00.000Z");
    });

    it("omits nullable fields when null", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      expect(record.projectId).toBeUndefined();
      expect(record.parentCaseId).toBeUndefined();
      expect(record.dueDate).toBeUndefined();
    });

    it("includes nullable fields when present", () => {
      const detail: CaseDetail = {
        ...baseDetail,
        projectId: "PROJ-1",
        parentCaseId: "CASE-0",
        dueDate: "2026-12-31",
      };
      const record = CaseRecord.fromDetail(detail);
      expect(record.projectId).toBe("PROJ-1");
      expect(record.parentCaseId).toBe("CASE-0");
      expect(record.dueDate).toBe("2026-12-31");
    });
  });

  describe("toDetail", () => {
    it("round-trips from detail and back", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      const restored = CaseRecord.toDetail(record);
      expect(restored).toEqual(baseDetail);
    });

    it("restores undefined nullable fields as null", () => {
      const record = CaseRecord.fromDetail(baseDetail);
      const restored = CaseRecord.toDetail(record);
      expect(restored.projectId).toBeNull();
      expect(restored.parentCaseId).toBeNull();
      expect(restored.dueDate).toBeNull();
    });

    it("round-trips with nullable fields present", () => {
      const detail: CaseDetail = {
        ...baseDetail,
        projectId: "PROJ-1",
        dueDate: "2026-12-31",
      };
      const restored = CaseRecord.toDetail(CaseRecord.fromDetail(detail));
      expect(restored.projectId).toBe("PROJ-1");
      expect(restored.dueDate).toBe("2026-12-31");
      expect(restored.parentCaseId).toBeNull();
    });
  });
});

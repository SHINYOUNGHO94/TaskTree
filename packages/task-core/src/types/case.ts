import { UserRole } from "./role";

export enum CaseStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW_REQUESTED = "REVIEW_REQUESTED",
  COMPLETED = "COMPLETED",
  ON_HOLD = "ON_HOLD",
  CANCELED = "CANCELED",
  REOPENED = "REOPENED",
}

export enum CaseDeliveryType {
  DIRECT = "DIRECT",
  OPEN = "OPEN",
}

export enum CaseType {
  REQUEST = "REQUEST",
  STANDARD = "STANDARD",
  PROJECT = "PROJECT",
}

export enum CaseOwnerType {
  USER = "USER",
  TEAM = "TEAM",
  DEPARTMENT = "DEPARTMENT",
  DIVISION = "DIVISION",
  COMPANY = "COMPANY",
}

export enum CaseTargetScope {
  COMPANY = "COMPANY",
  DIVISION = "DIVISION",
  DEPARTMENT = "DEPARTMENT",
  TEAM = "TEAM",
  USER = "USER",
}

export interface CaseSummary {
  caseId: string;

  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;

  creatorId: string;

  ownerType: CaseOwnerType;
  ownerId: string;

  title: string;
  caseType: CaseType;
  status: CaseStatus;
  deliveryType: CaseDeliveryType;

  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;

  projectId: string | null;
  parentCaseId: string | null;

  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseSummary {
  description: string;
}

export interface CreateCaseInput {
  title: string;
  description: string;
  caseType: CaseType;
  deliveryType: CaseDeliveryType;

  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;

  dueDate: string | null;

  projectId?: string;
  parentCaseId?: string;
}

export interface UpdateCaseInput {
  caseId: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
  dueDate?: string | null;
}

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

export interface CreateRootCaseInput {
  title: string;
  description: string;
  caseType: CaseType;
  deliveryType: CaseDeliveryType;

  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;

  dueDate: string | null;
}

export type CreateCaseInput = CreateRootCaseInput;

export interface UpdateCaseInput {
  caseId: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
  dueDate?: string | null;
}

export interface UpdateCaseStatusInput {
  status: CaseStatus;
}

export enum CaseTaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW_REQUESTED = "REVIEW_REQUESTED",
  DONE = "DONE",
  ON_HOLD = "ON_HOLD",
  CANCELED = "CANCELED",
}

export interface CaseTaskSummary {
  taskId: string;
  caseId: string;
  companyId: string;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  status: CaseTaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseTaskDetail extends CaseTaskSummary {
  description: string;
}

export interface CreateCaseTaskInput {
  title: string;
  description: string;
  dueDate: string | null;
}

export interface UpdateCaseTaskInput {
  title?: string;
  description?: string;
  status?: CaseTaskStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
}

export enum CaseHistoryAction {
  CASE_CREATED = "CASE_CREATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  CASE_UPDATED = "CASE_UPDATED",
  TASK_CREATED = "TASK_CREATED",
  TASK_UPDATED = "TASK_UPDATED",
  TASK_STATUS_CHANGED = "TASK_STATUS_CHANGED",
  TASK_ASSIGNEE_CHANGED = "TASK_ASSIGNEE_CHANGED",
  TASK_DELETED = "TASK_DELETED",
  CLAIM_REQUESTED = "CLAIM_REQUESTED",
  CLAIM_APPROVED = "CLAIM_APPROVED",
  CLAIM_REJECTED = "CLAIM_REJECTED",
  CHILD_CASE_CREATED = "CHILD_CASE_CREATED",
  PARTICIPANT_COMPANY_INVITED = "PARTICIPANT_COMPANY_INVITED",
  PARTICIPANT_COMPANY_ACCEPTED = "PARTICIPANT_COMPANY_ACCEPTED",
  PARTICIPANT_COMPANY_REJECTED = "PARTICIPANT_COMPANY_REJECTED",
}

export enum CaseParticipantCompanyStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  REMOVED = "REMOVED",
}

export interface CaseParticipantCompany {
  participantCompanyId: string;
  caseId: string;
  ownerCompanyId: string;
  companyId: string;
  companyName: string | null;
  status: CaseParticipantCompanyStatus;
  invitedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseInvitationSummary {
  caseId: string;
  title: string;
  caseType: CaseType;
  status: CaseStatus;
  deliveryType: CaseDeliveryType;
  ownerCompanyId: string;
  createdAt: string;
}

export interface ParticipantCompanyInvitation {
  participantCompany: CaseParticipantCompany;
  caseSummary: CaseInvitationSummary;
}

export interface InviteParticipantCompanyInput {
  companyId: string;
}

export interface UpdateParticipantCompanyStatusInput {
  status: CaseParticipantCompanyStatus.ACTIVE | CaseParticipantCompanyStatus.REJECTED;
}

export interface CompanySearchResult {
  companyId: string;
  name: string;
}

export interface InviteCompanyByEmailInput {
  email: string;
  caseId: string;
}

export interface EmailInvitation {
  invitationId: string;
  email: string;
  caseId: string;
  caseTitle: string | null;
  caseType: CaseType | null;
  caseStatus: CaseStatus | null;
  ownerCompanyId: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  createdAt: string;
}

export enum CaseClaimRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface CaseClaimRequest {
  claimRequestId: string;
  caseId: string;
  companyId: string;
  requesterId: string;
  status: CaseClaimRequestStatus;
  message: string | null;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseClaimRequestInput {
  message?: string;
}

export interface UpdateCaseClaimRequestInput {
  status: CaseClaimRequestStatus.APPROVED | CaseClaimRequestStatus.REJECTED;
  rejectReason?: string;
}

export interface CaseHistoryEntry {
  historyId: string;
  caseId: string;
  companyId: string;
  actorId: string;
  action: CaseHistoryAction;
  detail: string;
  createdAt: string;
}

export interface CaseComment {
  commentId: string;
  caseId: string;
  companyId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseCommentInput {
  content: string;
}

export interface CreateChildCaseInput {
  title: string;
  description: string;
  deliveryType: CaseDeliveryType;
  targetScope: CaseTargetScope;
  targetScopeId: string;
  requiredRole: UserRole;
  dueDate: string | null;
}

export enum TaskStatus {
  NOT_STARTED = "NOT_STARTED",
  WORKING = "WORKING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum AccessScope {
  COMPANY = "COMPANY",
  DIVISION = "DIVISION",
  DEPARTMENT = "DEPARTMENT",
  TEAM = "TEAM",
  PRIVATE = "PRIVATE",
}

export interface TaskSummary {
  id: string;

  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;

  creatorId: string;
  memberId: string;

  accessScope: AccessScope;
  title: string;
  status: TaskStatus;
  level: TaskLevel;
  limitDate: string; // YYYY-MM-DD or "NONE"
  createdAt: string;
}

export interface TaskDetail extends TaskSummary {
  content: string;
  updatedAt: string;
}

export type Task = TaskDetail;

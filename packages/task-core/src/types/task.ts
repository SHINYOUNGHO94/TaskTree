// タスクのステータス
export enum TaskStatus {
  NOT_STARTED = "NOT_STARTED", // 未着手
  WORKING = "WORKING",         // 作業中
  PAUSED = "PAUSED",           // 保留
  COMPLETED = "COMPLETED",     // 完了
  CANCELLED = "CANCELLED",     // 中止
}

// タスクの優先度
export enum TaskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

// タスクのアクセス範囲
export enum AccessScope {
  COMPANY = "COMPANY",       // 会社全体
  DIVISION = "DIVISION",     // 本部/事業部全体
  DEPARTMENT = "DEPARTMENT", // 部署全体
  TEAM = "TEAM",             // チーム全体
  PRIVATE = "PRIVATE",       // 担当者のみ
}

// 一覧表示用の要約情報
export interface TaskSummary {
  // タスクID
  id: string;

  // 階층ID
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;

  // 作成者ID
  creatorId: string;

  // 担当者ID (Member)
  memberId: string;

  // アクセス範囲
  accessScope: AccessScope;

  // タイトル
  title: string;

  // 現在のステータス
  status: TaskStatus;

  // 優先度
  level: TaskLevel;

  // 期限日 (YYYY-MM-DD 形式、または "NONE")
  limitDate: string;

  // 作成日時
  createdAt: string;
}

// 登録・更新・詳細表示用の全情報
export interface TaskDetail extends TaskSummary {
  // 詳細説明
  content: string;

  // 更新日時
  updatedAt: string;
}

// 基本タスクは全情報を表す
export type Task = TaskDetail;

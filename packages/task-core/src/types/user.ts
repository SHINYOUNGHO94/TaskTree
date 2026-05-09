import { UserRole } from "./role";

// ユーザーの組織階層情報を含むプロファイル
export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;

  // 組織階層名
  companyName: string;
  divisionName: string;
  departmentName: string;
  teamName: string;
  createdAt?: string;
  lastSignInAt?: string;
}

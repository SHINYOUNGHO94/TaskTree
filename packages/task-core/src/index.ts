// 役職名
export type UserRole = 'CEO' | 'DIRECTOR' | 'MANAGER' | 'LEADER' | 'MEMBER';

// 組織単位
export type OrgUnit = 'Corporation' | 'Division' | 'Department' | 'Team' | 'Unit';

// ユーザー基本情報
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

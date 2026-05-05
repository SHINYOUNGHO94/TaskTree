/**
 * 役職レベル (Hierarchy Levels)
 * Level 5: CEO ~ Level 1: Member
 */
export type UserLevel = 5 | 4 | 3 | 2 | 1;

/**
 * 役職名 (Role Names)
 */
export type UserRole = 'CEO' | 'DIRECTOR' | 'MANAGER' | 'LEADER' | 'MEMBER';

/**
 * 組織単位 (Organization Units)
 */
export type OrgUnit = 'Corporation' | 'Division' | 'Department' | 'Team' | 'Unit';

/**
 * ユーザー基本情報
 */
export interface User {
  id: string;
  email: string;
  name: string;
  level: UserLevel;
  role: UserRole;
  createdAt: string;
}

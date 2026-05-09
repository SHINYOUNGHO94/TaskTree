export enum UserRole {
  COMPANY_ADMIN = "COMPANY_ADMIN", // 社長・全体管理者
  DIVISION_ADMIN = "DIVISION_ADMIN", // 本部長・統括管理者
  DEPT_ADMIN = "DEPT_ADMIN",       // 部長・部門管理者
  TEAM_ADMIN = "TEAM_ADMIN",       // チームリーダー
  USER = "USER",                   // 一般メンバー
  GUEST = "GUEST",                 // 閲覧専用ゲスト
}

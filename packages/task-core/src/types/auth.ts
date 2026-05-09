// 認証関連の型定義
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

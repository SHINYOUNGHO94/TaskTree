import { signIn, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { AuthResult, AuthUser } from '../types/auth';

// AuthService: AWS Cognitoを利用した認証ロジックを管理するクラス
export const AuthService = {
  // ユーザーサインイン処理
  signIn: async (email: string, password: string): Promise<AuthResult> => {
    try {
      // Amplify SDKを使用してサインインを実行
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });

      if (isSignedIn) {
        // サインイン成功後、ユーザー属性を取得してユーザー情報を構築
        const attributes = await fetchUserAttributes();
        const user: AuthUser = {
          id: attributes.sub || '',
          email: attributes.email || '',
          name: attributes.nickname || attributes.email,
        };
        return { success: true, user };
      }

      // 次のステップ（パスワード変更等）が必要な場合の処理
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        return { success: false, error: 'NEW_PASSWORD_REQUIRED' };
      }

      return { success: false, error: 'SIGN_IN_FAILED' };
    } catch (error: unknown) {
      // エラーログの出力とクライアントへのエラー返却
      console.error('SignIn Error:', error);
      const errorName = (error instanceof Error) ? error.name : 'UNKNOWN_ERROR';
      return { 
        success: false, 
        error: errorName
      };
    }
  },

  // 現在ログインしているユーザー情報を取得する処理
  getCurrentUser: async (): Promise<AuthUser | null> => {
    try {
      // Amplify SDKを使用して現在のセッション情報を取得
      const attributes = await fetchUserAttributes();
      return {
        id: attributes.sub || '',
        email: attributes.email || '',
        name: attributes.nickname || attributes.email,
      };
    } catch (error) {
      // ログインしていない場合などはnullを返す
      return null;
    }
  },

  // ユーザーサインアウト処理
  signOut: async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('SignOut Error:', error);
    }
  }
};

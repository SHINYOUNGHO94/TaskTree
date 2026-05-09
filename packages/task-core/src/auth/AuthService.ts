import { signIn, signOut, fetchUserAttributes, signUp, confirmSignUp, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { AuthResult, AuthUser } from '../types/auth';

// AuthService: AWS Cognitoを利用した認証ロジックを管理するクラス
export const AuthService = {
  // ユーザーサインアップ
  signUp: async (email: string, password: string, name: string, companyName?: string): Promise<AuthResult> => {
    try {
      const { userId } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
            nickname: name,
            profile: companyName || "個人組織",
          },
        }
      });

      return {
        success: true,
        user: userId ? { id: userId, email } : undefined
      };
    } catch (error: unknown) {
      console.error('SignUp Error:', error);
      const errorName = (error instanceof Error) ? error.name : 'UNKNOWN_ERROR';
      return { success: false, error: errorName };
    }
  },

  // ユーザーサインアップ確認
  confirmSignUp: async (email: string, code: string, companyName?: string): Promise<AuthResult> => {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
        options: {
          clientMetadata: {
            companyName: companyName || "個人組織",
          }
        }
      });

      return { success: isSignUpComplete };
    } catch (error: unknown) {
      console.error('ConfirmSignUp Error:', error);
      const errorName = (error instanceof Error) ? error.name : 'UNKNOWN_ERROR';
      return { success: false, error: errorName };
    }
  },

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

  // 初回ログイン時のパスワード変更処理
  confirmNewPassword: async (newPassword: string): Promise<AuthResult> => {
    try {
      const { isSignedIn } = await confirmSignIn({
        challengeResponse: newPassword,
      });

      if (isSignedIn) {
        const attributes = await fetchUserAttributes();
        const user: AuthUser = {
          id: attributes.sub || '',
          email: attributes.email || '',
          name: attributes.nickname || attributes.email,
        };
        return { success: true, user };
      }
      return { success: false, error: 'SIGN_IN_FAILED' };
    } catch (error: unknown) {
      console.error('ConfirmSignIn Error:', error);
      const errorName = (error instanceof Error) ? error.name : 'UNKNOWN_ERROR';
      return { success: false, error: errorName };
    }
  },

  // 現在ログインしているユーザー情報を取得する処理
  getCurrentUser: async (): Promise<AuthUser | null> => {
    try {
      // 1. セッションの存在を安全に確認
      const session = await fetchAuthSession();
      if (!session.tokens) {
        return null;
      }

      // 2. セッションがあればユーザー属性を取得
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

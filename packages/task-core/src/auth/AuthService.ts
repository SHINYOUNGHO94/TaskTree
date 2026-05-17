import { signIn, signOut, fetchUserAttributes, signUp, confirmSignUp, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { AuthResult, AuthUser } from '../types/auth';

export const AuthService = {
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

  signIn: async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
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

      // 初回ログイン時のパスワード変更が必要な場合
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        return { success: false, error: 'NEW_PASSWORD_REQUIRED' };
      }

      return { success: false, error: 'SIGN_IN_FAILED' };
    } catch (error: unknown) {
      console.error('SignIn Error:', error);
      const errorName = (error instanceof Error) ? error.name : 'UNKNOWN_ERROR';
      return {
        success: false,
        error: errorName
      };
    }
  },

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

  getCurrentUser: async (): Promise<AuthUser | null> => {
    try {
      const session = await fetchAuthSession();
      if (!session.tokens) {
        return null;
      }

      const attributes = await fetchUserAttributes();
      return {
        id: attributes.sub || '',
        email: attributes.email || '',
        name: attributes.nickname || attributes.email,
      };
    } catch (error) {
      return null;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('SignOut Error:', error);
    }
  }
};

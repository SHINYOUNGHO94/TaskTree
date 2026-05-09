import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { UserProfile } from '../types/user';

// ユーザー関連のAPI操作を担当するサービス
export const UserService = {
  // ログイン中のユーザーの組織プロファイルを取得する
  getUserProfile: async (): Promise<UserProfile> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: 'user',
        options: {
          headers: {
            Authorization: idToken || '',
          }
        }
      });

      const response = await restOperation.response;
      if (response.statusCode !== 200) {
        throw new Error(`Profile not found (Status: ${response.statusCode})`);
      }
      const responseBody = (await response.body.json()) as any;
      return responseBody;
    } catch (error) {
      console.error("Failed to fetch user profile", error);
      throw error;
    }
  },

  // 同じ会社のメンバー一覧を取得
  getCompanyUsers: async (): Promise<UserProfile[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: "TaskApi",
        path: "user/company-users",
        options: {
          headers: {
            Authorization: idToken || '',
          }
        }
      });

      const response = await restOperation.response;
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch company users (Status: ${response.statusCode})`);
      }

      const responseBody = (await response.body.json()) as any;
      return responseBody.users as UserProfile[];
    } catch (error) {
      console.error("Failed to fetch company users", error);
      throw error;
    }
  },

  // 新しいメンバーを招待する
  inviteUser: async (params: { email: string; name: string; departmentId?: string; teamId?: string; role?: string }): Promise<{ userId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = post({
        apiName: "TaskApi",
        path: "user/invite",
        options: {
          body: params,
          headers: {
            Authorization: idToken || '',
          }
        }
      });

      const response = await restOperation.response;
      
      if (response.statusCode !== 200) {
        throw new Error(`Failed to invite user (Status: ${response.statusCode})`);
      }

      const responseBody = (await response.body.json()) as any;
      return responseBody as { userId: string };
    } catch (error) {
      console.error("Failed to invite user", error);
      throw error;
    }
  }
};

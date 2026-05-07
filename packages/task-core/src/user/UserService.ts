import { get } from 'aws-amplify/api';
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

      const { body } = await restOperation.response;
      return await body.json() as unknown as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};

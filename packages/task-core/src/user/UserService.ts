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

      const response = await restOperation.response;

      // 200以外のステータスコード(404等)の場合、body.json()を呼ばずにエラーを投げる
      if (response.statusCode !== 200) {
        throw new Error(`Profile not found (Status: ${response.statusCode})`);
      }

      const { body } = response;
      return await body.json() as unknown as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};

import { get, patch } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Notification } from '../types/notification';

export const NotificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      const restOperation = get({
        apiName: 'TaskApi',
        path: 'notifications',
        options: { headers: { Authorization: idToken || '' } },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      const restOperation = patch({
        apiName: 'TaskApi',
        path: `notifications/${encodeURIComponent(notificationId)}/read`,
        options: { headers: { Authorization: idToken || '' } },
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
};

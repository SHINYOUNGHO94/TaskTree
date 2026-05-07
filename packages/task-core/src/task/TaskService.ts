import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { TaskSummary, TaskDetail } from '../types/task';

// タスク関連のAPI操作を担当するサービス
export const TaskService = {
  // 1. タスク一覧の取得 (GET)
  getTasks: async (): Promise<TaskSummary[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: 'tasks',
        options: {
          headers: {
            Authorization: idToken || ''
          }
        }
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as TaskSummary[];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // 2. 新規タスクの作成 (POST)
  createTask: async (task: TaskDetail): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = post({
        apiName: 'TaskApi',
        path: 'tasks',
        options: {
          headers: {
            Authorization: idToken || ''
          },
          body: task as any,
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
};

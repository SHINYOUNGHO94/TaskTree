import { get, post, put, del } from 'aws-amplify/api';
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: task as any,
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // 3. タスク詳細の取得 (GET)
  getTask: async (taskId: string): Promise<TaskDetail> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `tasks/${taskId}`,
        options: {
          headers: { Authorization: idToken || '' }
        }
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as TaskDetail;
    } catch (error) {
      console.error('Error fetching task detail:', error);
      throw error;
    }
  },

  // 4. タスクの更新 (PUT)
  updateTask: async (task: TaskDetail): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = put({
        apiName: 'TaskApi',
        path: `tasks/${task.id}`,
        options: {
          headers: { Authorization: idToken || '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: task as any,
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // 5. タスクの削除 (DELETE)
  deleteTask: async (taskId: string): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = del({
        apiName: 'TaskApi',
        path: `tasks/${taskId}`,
        options: {
          headers: { Authorization: idToken || '' }
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};

import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { TaskSummary, TaskDetail, CreateTaskInput, UpdateTaskInput } from '../types/task';

export const TaskService = {
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

  createTask: async (input: CreateTaskInput): Promise<void> => {
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
          body: input as any,
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

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

  updateTask: async (input: UpdateTaskInput): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const { id, ...fields } = input;
      const body = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined)
      );

      const restOperation = put({
        apiName: 'TaskApi',
        path: `tasks/${id}`,
        options: {
          headers: { Authorization: idToken || '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body: body as any,
        }
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

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

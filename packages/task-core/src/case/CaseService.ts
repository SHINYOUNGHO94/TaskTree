import { get, post, put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  CaseDetail,
  CaseTaskDetail,
  CreateCaseTaskInput,
  CreateRootCaseInput,
  UpdateCaseStatusInput,
} from '../types/case';

export const CaseService = {
  createCase: async (input: CreateRootCaseInput): Promise<{ caseId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();
      const body = { ...input };

      const restOperation = post({
        apiName: 'TaskApi',
        path: 'cases',
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { caseId: string };
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  },

  getCases: async (): Promise<CaseDetail[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: 'cases',
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseDetail[];
    } catch (error) {
      console.error('Error fetching cases:', error);
      throw error;
    }
  },

  getCase: async (caseId: string): Promise<CaseDetail> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseDetail;
    } catch (error) {
      console.error('Error fetching case:', error);
      throw error;
    }
  },

  getCaseTasks: async (caseId: string): Promise<CaseTaskDetail[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/tasks`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseTaskDetail[];
    } catch (error) {
      console.error('Error fetching case tasks:', error);
      throw error;
    }
  },

  createCaseTask: async (caseId: string, input: CreateCaseTaskInput): Promise<{ taskId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string | null> = {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
      };
      const restOperation = post({
        apiName: 'TaskApi',
        path: `cases/${caseId}/tasks`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { taskId: string };
    } catch (error) {
      console.error('Error creating case task:', error);
      throw error;
    }
  },

  updateCaseStatus: async (caseId: string, input: UpdateCaseStatusInput): Promise<{ caseId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string> = { status: input.status };
      const restOperation = put({
        apiName: 'TaskApi',
        path: `cases/${caseId}`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { caseId: string };
    } catch (error) {
      console.error('Error updating case status:', error);
      throw error;
    }
  },
};

import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { CaseDetail, CreateRootCaseInput } from '../types/case';

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
};

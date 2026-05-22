import { del, get, post, put } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  CaseClaimRequest,
  CaseComment,
  CaseDetail,
  CaseHistoryEntry,
  CaseParticipantCompany,
  CaseTaskDetail,
  CreateCaseClaimRequestInput,
  CreateCaseCommentInput,
  CreateCaseTaskInput,
  CreateChildCaseInput,
  CreateRootCaseInput,
  InviteParticipantCompanyInput,
  ParticipantCompanyInvitation,
  UpdateCaseClaimRequestInput,
  UpdateCaseStatusInput,
  UpdateCaseTaskInput,
  UpdateParticipantCompanyStatusInput,
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

  getCaseHistory: async (caseId: string): Promise<CaseHistoryEntry[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/history`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseHistoryEntry[];
    } catch (error) {
      console.error('Error fetching case history:', error);
      throw error;
    }
  },

  getCaseComments: async (caseId: string): Promise<CaseComment[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/comments`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseComment[];
    } catch (error) {
      console.error('Error fetching case comments:', error);
      throw error;
    }
  },

  createCaseComment: async (caseId: string, input: CreateCaseCommentInput): Promise<{ commentId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string> = { content: input.content };
      const restOperation = post({
        apiName: 'TaskApi',
        path: `cases/${caseId}/comments`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { commentId: string };
    } catch (error) {
      console.error('Error creating case comment:', error);
      throw error;
    }
  },

  getCaseClaimRequests: async (caseId: string): Promise<CaseClaimRequest[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/claim-requests`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseClaimRequest[];
    } catch (error) {
      console.error('Error fetching case claim requests:', error);
      throw error;
    }
  },

  createCaseClaimRequest: async (caseId: string, input: CreateCaseClaimRequestInput): Promise<{ claimRequestId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string> = {};
      if (input.message) body.message = input.message;

      const restOperation = post({
        apiName: 'TaskApi',
        path: `cases/${caseId}/claim-requests`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { claimRequestId: string };
    } catch (error) {
      console.error('Error creating case claim request:', error);
      throw error;
    }
  },

  getChildCases: async (caseId: string): Promise<CaseDetail[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/children`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseDetail[];
    } catch (error) {
      console.error('Error fetching child cases:', error);
      throw error;
    }
  },

  createChildCase: async (caseId: string, input: CreateChildCaseInput): Promise<{ caseId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string | null> = {
        title: input.title,
        description: input.description,
        deliveryType: input.deliveryType,
        targetScope: input.targetScope,
        targetScopeId: input.targetScopeId,
        requiredRole: input.requiredRole,
        dueDate: input.dueDate,
      };

      const restOperation = post({
        apiName: 'TaskApi',
        path: `cases/${caseId}/children`,
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
      console.error('Error creating child case:', error);
      throw error;
    }
  },

  updateCaseClaimRequest: async (
    caseId: string,
    claimRequestId: string,
    input: UpdateCaseClaimRequestInput,
  ): Promise<{ claimRequestId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string> = { status: input.status };
      if (input.rejectReason) body.rejectReason = input.rejectReason;

      const restOperation = put({
        apiName: 'TaskApi',
        path: `cases/${caseId}/claim-requests/${claimRequestId}`,
        options: {
          headers: {
            Authorization: idToken || '',
          },
          body,
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { claimRequestId: string };
    } catch (error) {
      console.error('Error updating case claim request:', error);
      throw error;
    }
  },

  getParticipantCompanies: async (caseId: string): Promise<CaseParticipantCompany[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: `cases/${caseId}/participant-companies`,
        options: {
          headers: { Authorization: idToken || '' },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as CaseParticipantCompany[];
    } catch (error) {
      console.error('Error fetching participant companies:', error);
      throw error;
    }
  },

  inviteParticipantCompany: async (
    caseId: string,
    input: InviteParticipantCompanyInput,
  ): Promise<{ participantCompanyId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = post({
        apiName: 'TaskApi',
        path: `cases/${caseId}/participant-companies`,
        options: {
          headers: { Authorization: idToken || '' },
          body: { companyId: input.companyId },
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { participantCompanyId: string };
    } catch (error) {
      console.error('Error inviting participant company:', error);
      throw error;
    }
  },

  getParticipantCompanyInvitations: async (): Promise<ParticipantCompanyInvitation[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: 'TaskApi',
        path: 'cases/participant-company-invitations',
        options: {
          headers: { Authorization: idToken || '' },
        },
      });
      const { body } = await restOperation.response;
      return await body.json() as unknown as ParticipantCompanyInvitation[];
    } catch (error) {
      console.error('Error fetching participant company invitations:', error);
      throw error;
    }
  },

  updateParticipantCompanyStatus: async (
    caseId: string,
    participantCompanyId: string,
    input: UpdateParticipantCompanyStatusInput,
  ): Promise<{ participantCompanyId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = put({
        apiName: 'TaskApi',
        path: `cases/${caseId}/participant-companies/${participantCompanyId}`,
        options: {
          headers: { Authorization: idToken || '' },
          body: { status: input.status },
        },
      });
      const response = await restOperation.response;
      return await response.body.json() as unknown as { participantCompanyId: string };
    } catch (error) {
      console.error('Error updating participant company status:', error);
      throw error;
    }
  },

  updateCaseTask: async (
    caseId: string,
    taskId: string,
    input: UpdateCaseTaskInput,
  ): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const body: Record<string, string | null> = {};
      if (input.title !== undefined) body.title = input.title;
      if (input.description !== undefined) body.description = input.description;
      if (input.status !== undefined) body.status = input.status;
      if (input.assigneeId !== undefined) body.assigneeId = input.assigneeId ?? null;
      if (input.dueDate !== undefined) body.dueDate = input.dueDate ?? null;

      const restOperation = put({
        apiName: 'TaskApi',
        path: `cases/${caseId}/tasks/${taskId}`,
        options: {
          headers: { Authorization: idToken || '' },
          body,
        },
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error updating case task:', error);
      throw error;
    }
  },

  deleteCaseTask: async (caseId: string, taskId: string): Promise<void> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = del({
        apiName: 'TaskApi',
        path: `cases/${caseId}/tasks/${taskId}`,
        options: {
          headers: { Authorization: idToken || '' },
        },
      });
      await restOperation.response;
    } catch (error) {
      console.error('Error deleting case task:', error);
      throw error;
    }
  },
};

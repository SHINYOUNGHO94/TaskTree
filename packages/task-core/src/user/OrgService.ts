import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface Department {
  departmentId: string;
  name: string;
  companyId: string;
  divisionId: string;
}

export interface Team {
  teamId: string;
  name: string;
  companyId: string;
  divisionId: string;
  departmentId: string;
}

export const OrgService = {
  getDepartments: async (): Promise<Department[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const restOperation = get({
        apiName: "TaskApi",
        path: "department",
        options: { headers: { Authorization: tokens?.idToken?.toString() || '' } }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 200) throw new Error("Failed to fetch departments");
      const body = (await response.body.json()) as any;
      return body.departments;
    } catch (error) {
      console.error("Failed to fetch departments", error);
      throw error;
    }
  },

  createDepartment: async (name: string, companyId: string, divisionId: string = "NONE"): Promise<{ departmentId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const departmentId = `DEPT-${Date.now()}`;
      const restOperation = post({
        apiName: "TaskApi",
        path: "department",
        options: {
          headers: { Authorization: tokens?.idToken?.toString() || '' },
          body: { name, companyId, divisionId, departmentId }
        }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 201) throw new Error("Failed to create department");
      return { departmentId };
    } catch (error) {
      console.error("Failed to create department", error);
      throw error;
    }
  },

  getTeams: async (): Promise<Team[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const restOperation = get({
        apiName: "TaskApi",
        path: "team",
        options: { headers: { Authorization: tokens?.idToken?.toString() || '' } }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 200) throw new Error("Failed to fetch teams");
      const body = (await response.body.json()) as any;
      return body.teams;
    } catch (error) {
      console.error("Failed to fetch teams", error);
      throw error;
    }
  },

  createTeam: async (name: string, companyId: string, departmentId: string, divisionId: string = "NONE"): Promise<{ teamId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const teamId = `TEAM-${Date.now()}`;
      const restOperation = post({
        apiName: "TaskApi",
        path: "team",
        options: {
          headers: { Authorization: tokens?.idToken?.toString() || '' },
          body: { name, companyId, divisionId, departmentId, teamId }
        }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 201) throw new Error("Failed to create team");
      return { teamId };
    } catch (error) {
      console.error("Failed to create team", error);
      throw error;
    }
  }
};

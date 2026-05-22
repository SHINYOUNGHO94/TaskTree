import { get, post, put, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { z } from 'zod';

export interface Division {
  divisionId: string;
  name: string;
  companyId: string;
}

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

const DivisionSchema = z.object({
  divisionId: z.string(),
  name: z.string(),
  companyId: z.string(),
});

const DepartmentSchema = z.object({
  departmentId: z.string(),
  name: z.string(),
  companyId: z.string(),
  divisionId: z.string(),
});

const TeamSchema = z.object({
  teamId: z.string(),
  name: z.string(),
  companyId: z.string(),
  divisionId: z.string(),
  departmentId: z.string(),
});

const DivisionsResponseSchema = z.object({
  divisions: z.array(DivisionSchema),
});

const DepartmentsResponseSchema = z.object({
  departments: z.array(DepartmentSchema),
});

const TeamsResponseSchema = z.object({
  teams: z.array(TeamSchema),
});


export const OrgService = {
  getDivisions: async (): Promise<Division[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const restOperation = get({
        apiName: "TaskApi",
        path: "division",
        options: { headers: { Authorization: tokens?.idToken?.toString() || '' } }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 200) throw new Error("Failed to fetch divisions");
      const json = await response.body.json();
      const body = DivisionsResponseSchema.parse(json);
      return body.divisions;
    } catch (error) {
      console.error("Failed to fetch divisions", error);
      return [];
    }
  },
 
  createDivision: async (name: string): Promise<{ divisionId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const divisionId = `DIV-${Date.now()}`;
      const restOperation = post({
        apiName: "TaskApi",
        path: "division",
        options: {
          headers: { Authorization: tokens?.idToken?.toString() || '' },
          body: { name, divisionId }
        }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 201) throw new Error("Failed to create division");
      return { divisionId };
    } catch (error) {
      throw error;
    }
  },
 
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
      const json = await response.body.json();
      const body = DepartmentsResponseSchema.parse(json);
      return body.departments;
    } catch (error) {
      console.error("Failed to fetch departments", error);
      throw error;
    }
  },

  createDepartment: async (name: string, divisionId: string = "NONE"): Promise<{ departmentId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const departmentId = `DEPT-${Date.now()}`;
      const restOperation = post({
        apiName: "TaskApi",
        path: "department",
        options: {
          headers: { Authorization: tokens?.idToken?.toString() || '' },
          body: { name, divisionId, departmentId }
        }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 201) throw new Error("Failed to create department");
      return { departmentId };
    } catch (error) {
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
      const json = await response.body.json();
      const body = TeamsResponseSchema.parse(json);
      return body.teams;
    } catch (error) {
      console.error("Failed to fetch teams", error);
      throw error;
    }
  },

  createTeam: async (name: string, departmentId: string, divisionId: string = "NONE"): Promise<{ teamId: string }> => {
    try {
      const { tokens } = await fetchAuthSession();
      const teamId = `TEAM-${Date.now()}`;
      const restOperation = post({
        apiName: "TaskApi",
        path: "team",
        options: {
          headers: { Authorization: tokens?.idToken?.toString() || '' },
          body: { name, divisionId, departmentId, teamId }
        }
      });
      const response = await restOperation.response;
      if (response.statusCode !== 201) throw new Error("Failed to create team");
      return { teamId };
    } catch (error) {
      throw error;
    }
  },

  updateDivision: async (divisionId: string, name: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = put({
      apiName: "TaskApi",
      path: `division/${divisionId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
        body: { name },
      },
    });
    await restOperation.response;
  },

  deleteDivision: async (divisionId: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = del({
      apiName: "TaskApi",
      path: `division/${divisionId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
      },
    });
    await restOperation.response;
  },

  updateDepartment: async (departmentId: string, name: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = put({
      apiName: "TaskApi",
      path: `department/${departmentId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
        body: { name },
      },
    });
    await restOperation.response;
  },

  deleteDepartment: async (departmentId: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = del({
      apiName: "TaskApi",
      path: `department/${departmentId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
      },
    });
    await restOperation.response;
  },

  updateTeam: async (teamId: string, name: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = put({
      apiName: "TaskApi",
      path: `team/${teamId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
        body: { name },
      },
    });
    await restOperation.response;
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const restOperation = del({
      apiName: "TaskApi",
      path: `team/${teamId}`,
      options: {
        headers: { Authorization: tokens?.idToken?.toString() || '' },
      },
    });
    await restOperation.response;
  },
};

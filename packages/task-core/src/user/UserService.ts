import { get, post, del } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { UserProfile } from '../types/user';
import { UserRole } from '../types/role';
import { z } from 'zod';

const UserProfileSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum([UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN, UserRole.TEAM_ADMIN, UserRole.USER, UserRole.GUEST]),
  companyId: z.string(),
  divisionId: z.string(),
  departmentId: z.string(),
  teamId: z.string(),
  companyName: z.string().nullable(),
  divisionName: z.string().nullable(),
  departmentName: z.string().nullable(),
  teamName: z.string().nullable(),
  createdAt: z.string(),
  lastSignInAt: z.string().nullable()
});

const CompanyUsersResponseSchema = z.object({
  users: z.array(UserProfileSchema),
});

const InviteUserResponseSchema = z.object({
  userId: z.string(),
});

export const UserService = {
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
      if (response.statusCode !== 200) {
        throw new Error(`Profile not found (Status: ${response.statusCode})`);
      }
      const json = await response.body.json();
      const responseBody = UserProfileSchema.parse(json);
      return responseBody;
    } catch (error) {
      console.error("Failed to fetch user profile", error);
      throw error;
    }
  },

  getCompanyUsers: async (): Promise<UserProfile[]> => {
    try {
      const { tokens } = await fetchAuthSession();
      const idToken = tokens?.idToken?.toString();

      const restOperation = get({
        apiName: "TaskApi",
        path: "user/company-users",
        options: {
          headers: {
            Authorization: idToken || '',
          }
        }
      });

      const response = await restOperation.response;

      if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch company users (Status: ${response.statusCode})`);
      }

      const json = await response.body.json();
      const responseBody = CompanyUsersResponseSchema.parse(json);
      return responseBody.users;
    } catch (error) {
      console.error("Failed to fetch company users", error);
      throw error;
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();

    const restOperation = del({
      apiName: "TaskApi",
      path: `user/${userId}`,
      options: {
        headers: {
          Authorization: idToken || '',
        }
      }
    });

    const response = await restOperation.response;

    if (response.statusCode !== 200) {
      const json = await response.body.json() as { error?: string };
      throw new Error(json?.error || `Failed to delete user (Status: ${response.statusCode})`);
    }
  },

  inviteUser: async (params: { email: string; name: string; divisionId?: string; departmentId?: string; teamId?: string; role?: string }): Promise<{ userId: string }> => {
    const { tokens } = await fetchAuthSession();
    const idToken = tokens?.idToken?.toString();

    const restOperation = post({
      apiName: "TaskApi",
      path: "user/invite",
      options: {
        body: params,
        headers: {
          Authorization: idToken || '',
        }
      }
    });

    const response = await restOperation.response;

    if (response.statusCode !== 200) {
      throw new Error(`Failed to invite user (Status: ${response.statusCode})`);
    }

    const json = await response.body.json();
    const responseBody = InviteUserResponseSchema.parse(json);
    return responseBody;
  }
};

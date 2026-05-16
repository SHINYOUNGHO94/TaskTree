import { UserRole } from "./role";

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  divisionId: string;
  departmentId: string;
  teamId: string;

  companyName: string | null;
  divisionName: string | null;
  departmentName: string | null;
  teamName: string | null;
  
  createdAt: string;
  lastSignInAt: string | null;
}

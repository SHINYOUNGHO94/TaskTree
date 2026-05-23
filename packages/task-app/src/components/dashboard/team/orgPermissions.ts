import { UserRole } from "@task/core";

export type OrgTarget =
  | { type: "division"; id: string; name: string }
  | { type: "department"; id: string; name: string }
  | { type: "team"; id: string; name: string };

export const orgTypeLabel = (type: OrgTarget["type"]): string =>
  type === "division" ? "Division" : type === "department" ? "Department" : "Team";

export const ORG_ALLOWED_ROLES: UserRole[] = [
  UserRole.COMPANY_ADMIN,
  UserRole.DIVISION_ADMIN,
  UserRole.DEPT_ADMIN,
  UserRole.TEAM_ADMIN,
];

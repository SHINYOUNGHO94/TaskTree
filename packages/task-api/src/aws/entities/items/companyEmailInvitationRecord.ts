export interface CompanyEmailInvitationRecordType {
  pk: string;
  sk: string;
  invitationId: string;
  email: string;
  caseId: string;
  ownerCompanyId: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  createdAt: string;
}

export const CompanyEmailInvitationRecord = {
  entityName: "CompanyEmailInvitation" as const,
  makePk: () => "CompanyEmailInvitation",
  makeSk: (email: string, caseId: string) => `Email#${email}#Case#${caseId}`,
};

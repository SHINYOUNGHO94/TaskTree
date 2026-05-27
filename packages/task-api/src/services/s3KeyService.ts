export interface CaseFileKeyParts {
  companyId: string;
  caseId: string;
  fileId: string;
}

export const buildCaseFileKey = (
  companyId: string,
  caseId: string,
  fileId: string,
): string => `${companyId}/cases/${caseId}/files/${fileId}`;

export const parseCaseFileKey = (key: string): CaseFileKeyParts | null => {
  const parts = key.split("/");
  if (parts.length !== 5) return null;
  if (parts[1] !== "cases") return null;
  if (parts[3] !== "files") return null;
  const [companyId, , caseId, , fileId] = parts;
  if (!companyId || !caseId || !fileId) return null;
  return { companyId, caseId, fileId };
};

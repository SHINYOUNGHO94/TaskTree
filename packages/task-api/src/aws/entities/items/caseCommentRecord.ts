import { CaseComment } from "@task/core";

export interface CaseCommentRecordType {
  pk: string;
  sk: string;
  commentId: string;
  caseId: string;
  caseSortKey: string;
  companyId: string;
  authorId: string;
  content: string;
  at: string;
  update_at: string;
}

const ENTITY_NAME = "CaseComment" as const;

const makePk = () => ENTITY_NAME;
const makeSk = (caseId: string, commentId: string) => `Case#${caseId}#CaseComment#${commentId}`;
const makeCaseSortKey = (createdAt: string, commentId: string) =>
  `CaseComment#${createdAt}#${commentId}`;

const fromComment = (comment: CaseComment): CaseCommentRecordType => ({
  pk: makePk(),
  sk: makeSk(comment.caseId, comment.commentId),
  commentId: comment.commentId,
  caseId: comment.caseId,
  caseSortKey: makeCaseSortKey(comment.createdAt, comment.commentId),
  companyId: comment.companyId,
  authorId: comment.authorId,
  content: comment.content,
  at: comment.createdAt,
  update_at: comment.updatedAt,
});

const toComment = (record: CaseCommentRecordType): CaseComment => ({
  commentId: record.commentId,
  caseId: record.caseId,
  companyId: record.companyId,
  authorId: record.authorId,
  content: record.content,
  createdAt: record.at,
  updatedAt: record.update_at,
});

export const CaseCommentRecord = {
  entityName: ENTITY_NAME,
  makePk,
  makeSk,
  makeCaseSortKey,
  fromComment,
  toComment,
} as const;

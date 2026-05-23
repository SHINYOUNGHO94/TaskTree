"use client";

import { useState } from "react";
import { AlertCircle, User } from "lucide-react";
import { CaseComment, CaseService } from "@task/core";
import { resolveDisplayName } from "../dashboard/caseLabels";

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CaseCommentsSectionProps {
  caseId: string;
  comments: CaseComment[];
  isLoading: boolean;
  error: string | null;
  userMap: Map<string, { name: string; email: string }>;
  onRefresh: () => Promise<void>;
}

export const CaseCommentsSection = ({
  caseId,
  comments,
  isLoading,
  error,
  userMap,
  onRefresh,
}: CaseCommentsSectionProps) => {
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);

  const handleSubmitComment = async () => {
    if (!newCommentContent.trim()) {
      setCommentSubmitError("コメント内容を入力してください。");
      return;
    }
    setIsSubmittingComment(true);
    setCommentSubmitError(null);
    try {
      await CaseService.createCaseComment(caseId, { content: newCommentContent.trim() });
      setNewCommentContent("");
      await onRefresh();
    } catch {
      setCommentSubmitError("コメントの送信に失敗しました。再度お試しください。");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">コメント</h3>
        <p className="text-xs text-gray-400 mt-0.5">案件に関するディスカッション</p>
      </div>

      <div className="p-6 border-b border-gray-100 bg-gray-50/30">
        <div className="space-y-3">
          {commentSubmitError && <ErrorAlert message={commentSubmitError} />}
          <textarea
            value={newCommentContent}
            onChange={(e) => setNewCommentContent(e.target.value)}
            placeholder="コメントを入力..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none bg-white"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={isSubmittingComment || !newCommentContent.trim()}
              className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmittingComment ? "送信中..." : "コメントを送信"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : error ? (
          <ErrorAlert message={error} />
        ) : comments.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-sm text-gray-400">コメントはまだありません。</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {comments.map((comment) => (
              <li key={comment.commentId} className="flex items-start gap-3.5">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 shadow-sm">
                  <User size={16} />
                </div>
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">{resolveDisplayName(comment.authorId, userMap)}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(comment.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

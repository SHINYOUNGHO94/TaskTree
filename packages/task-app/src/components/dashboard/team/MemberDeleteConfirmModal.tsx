"use client";

import { UserProfile } from "@task/core";

type MemberDeleteConfirmModalProps = {
  member: UserProfile;
  isMutating: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function MemberDeleteConfirmModal({
  member,
  isMutating,
  onConfirm,
  onClose,
}: MemberDeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">メンバーを削除</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{member.name}</span> を削除しますか？
            この操作は元に戻せません。
          </p>
          <p className="text-xs text-gray-400">
            Cognito ユーザーと組織メンバー情報の両方が削除されます。
          </p>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isMutating}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              {isMutating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "削除する"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

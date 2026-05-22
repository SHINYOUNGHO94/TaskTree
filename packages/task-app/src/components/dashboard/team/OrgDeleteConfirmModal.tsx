"use client";

import { OrgTarget, orgTypeLabel } from "./orgPermissions";

type OrgDeleteConfirmModalProps = {
  deleteTarget: OrgTarget;
  isOrgMutating: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function OrgDeleteConfirmModal({
  deleteTarget,
  isOrgMutating,
  onConfirm,
  onClose,
}: OrgDeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{orgTypeLabel(deleteTarget.type)}を削除</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{deleteTarget.name}</span> を削除しますか？この操作は元に戻せません。
          </p>
          <p className="text-xs text-gray-400">所属メンバーや下位組織が存在する場合は削除できません。</p>
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
              disabled={isOrgMutating}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              {isOrgMutating ? (
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

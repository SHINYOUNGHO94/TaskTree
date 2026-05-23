"use client";

import { AlertTriangle, X } from "lucide-react";
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 bg-gradient-to-r from-rose-500 to-red-600" />
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
              <AlertTriangle size={14} className="text-rose-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{orgTypeLabel(deleteTarget.type)}を削除</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            <span className="font-bold text-slate-900">{deleteTarget.name}</span> を削除しますか？この操作は元に戻せません。
          </p>
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
            所属メンバーや下位組織が存在する場合は削除できません。
          </p>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isOrgMutating}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-200/60 disabled:opacity-50 transition-all shadow-md shadow-rose-300/20 flex justify-center items-center"
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

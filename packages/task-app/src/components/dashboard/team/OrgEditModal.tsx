"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { OrgTarget, orgTypeLabel } from "./orgPermissions";

type OrgEditModalProps = {
  editTarget: OrgTarget;
  isOrgMutating: boolean;
  error: string | null;
  onSubmit: (newName: string) => void;
  onClose: () => void;
};

export function OrgEditModal({ editTarget, isOrgMutating, error, onSubmit, onClose }: OrgEditModalProps) {
  const [editName, setEditName] = useState(editTarget.name);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onSubmit(editName.trim());
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Pencil size={14} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{orgTypeLabel(editTarget.type)}名を変更</h3>
              <p className="text-xs text-slate-500 mt-0.5">{editTarget.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">新しい名前</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all placeholder:text-slate-300"
              placeholder={editTarget.name}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isOrgMutating || !editName.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200/60 disabled:opacity-50 transition-all shadow-md shadow-indigo-300/20 flex justify-center items-center"
            >
              {isOrgMutating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "変更する"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

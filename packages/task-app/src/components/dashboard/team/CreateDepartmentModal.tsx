"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Division } from "@task/core";
import { extractOrgError } from "./orgError";

type CreateDepartmentModalProps = {
  divisions: Division[];
  onSubmit: (name: string, divisionId: string) => Promise<void>;
  onClose: () => void;
};

export function CreateDepartmentModal({ divisions, onSubmit, onClose }: CreateDepartmentModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim() || !divisionId) return;
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(name.trim(), divisionId);
    } catch (err) {
      setError(t(extractOrgError(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">部署を追加</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">上位の本部</label>
            <select
              required
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white"
            >
              <option value="" disabled>本部を選択してください</option>
              {divisions.map((d) => (
                <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">部署名</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
              placeholder="例: 開発部"
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
            >
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "追加する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

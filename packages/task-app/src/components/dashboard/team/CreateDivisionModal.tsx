"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { extractOrgError } from "./orgError";

type CreateDivisionModalProps = {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

export function CreateDivisionModal({ onSubmit, onClose }: CreateDivisionModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(name.trim());
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
          <h3 className="text-lg font-bold text-gray-900">本部を追加</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">本部名</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
              placeholder="例: 戦略営業本部"
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

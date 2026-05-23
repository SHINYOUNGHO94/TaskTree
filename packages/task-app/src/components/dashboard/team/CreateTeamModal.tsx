"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Department } from "@task/core";
import { extractOrgError } from "./orgError";

type CreateTeamModalProps = {
  departments: Department[];
  onSubmit: (name: string, departmentId: string) => Promise<void>;
  onClose: () => void;
};

export function CreateTeamModal({ departments, onSubmit, onClose }: CreateTeamModalProps) {
  const { t } = useTranslation("ui");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim() || !departmentId) return;
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(name.trim(), departmentId);
    } catch (err) {
      setError(extractOrgError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t("Add Team")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("Add Team desc")}</p>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("Parent Department")}</label>
            <select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 transition-all bg-white"
            >
              <option value="" disabled>{t("Select parent department")}</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("Team Name")}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 transition-all placeholder:text-slate-300"
              placeholder={t("Team name placeholder")}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isLoading || !departmentId}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200/60 disabled:opacity-50 transition-all shadow-md shadow-emerald-300/20 flex justify-center items-center"
            >
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : t("Add (action)")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

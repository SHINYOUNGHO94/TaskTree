"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { CaseDetail, CaseService } from "@task/core";

interface EditCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseDetail: CaseDetail;
  onSuccess: (updatedFields: { title: string; description: string; dueDate: string | null }) => void;
}

export const EditCaseModal: React.FC<EditCaseModalProps> = ({
  isOpen,
  onClose,
  caseDetail,
  onSuccess,
}) => {
  const { t } = useTranslation("ui");

  const [title, setTitle] = useState(caseDetail.title);
  const [description, setDescription] = useState(caseDetail.description);
  const [dueDate, setDueDate] = useState(caseDetail.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(caseDetail.title);
      setDescription(caseDetail.description);
      setDueDate(caseDetail.dueDate ?? "");
      setError(null);
    }
  }, [isOpen, caseDetail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("Please enter a title."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await CaseService.updateCase(caseDetail.caseId, {
        title: title.trim(),
        description,
        dueDate: dueDate.trim() || null,
      });
      onSuccess({ title: title.trim(), description, dueDate: dueDate.trim() || null });
      onClose();
    } catch {
      setError(t("Failed to update case. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{t("Edit Case")}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("Edit case title *")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder={t("Enter case title")}
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("Edit case description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              placeholder={t("Enter case details...")}
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("Edit case dueDate")}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={saving}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              {saving ? t("Saving...") : t("Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

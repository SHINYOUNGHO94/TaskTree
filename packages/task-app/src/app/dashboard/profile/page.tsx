"use client";

import { useState } from "react";
import { UserService, UserRole } from "@task/core";
import { useUser } from "../../../components/providers/UserProvider";
import { User, Building2, Check, X, Pencil } from "lucide-react";

export default function ProfilePage() {
  const { profile, refreshUser } = useUser();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [editingCompany, setEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const isAdmin = profile?.role === UserRole.COMPANY_ADMIN;

  const startEditName = () => {
    setNameInput(profile?.name ?? "");
    setNameError(null);
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameError(null);
  };

  const saveName = async () => {
    if (!nameInput.trim()) { setNameError("名前を入力してください。"); return; }
    setNameLoading(true);
    setNameError(null);
    try {
      await UserService.updateProfile({ name: nameInput.trim() });
      await refreshUser();
      setEditingName(false);
    } catch {
      setNameError("更新に失敗しました。");
    } finally {
      setNameLoading(false);
    }
  };

  const startEditCompany = () => {
    setCompanyInput(profile?.companyName ?? "");
    setCompanyError(null);
    setEditingCompany(true);
  };

  const cancelEditCompany = () => {
    setEditingCompany(false);
    setCompanyError(null);
  };

  const saveCompany = async () => {
    if (!companyInput.trim()) { setCompanyError("会社名を入力してください。"); return; }
    setCompanyLoading(true);
    setCompanyError(null);
    try {
      await UserService.updateCompanyName({ name: companyInput.trim() });
      await refreshUser();
      setEditingCompany(false);
    } catch {
      setCompanyError("更新に失敗しました。");
    } finally {
      setCompanyLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold flex items-center gap-2.5 text-slate-800">
          <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
            <User size={15} className="text-white" />
          </div>
          プロフィール設定
        </h2>
        <p className="text-slate-600 text-sm mt-1">名前や会社情報を編集できます。</p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <User size={13} className="text-slate-400" />
              名前
            </h3>
            {!editingName && (
              <button
                onClick={startEditName}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Pencil size={11} />
                編集
              </button>
            )}
          </div>

          {editingName ? (
            <div className="space-y-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-600">{nameError}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveName}
                  disabled={nameLoading}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  <Check size={12} />
                  {nameLoading ? "保存中..." : "保存"}
                </button>
                <button
                  onClick={cancelEditName}
                  disabled={nameLoading}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  <X size={12} />
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
          )}
        </div>

        {/* Email (read-only) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">メールアドレス</h3>
          <p className="text-sm text-slate-500">{profile.email}</p>
        </div>

        {/* Role (read-only) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">ロール</h3>
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
            {profile.role}
          </span>
        </div>

        {/* Company name (COMPANY_ADMIN only) */}
        {isAdmin && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Building2 size={13} className="text-slate-400" />
                会社名
              </h3>
              {!editingCompany && (
                <button
                  onClick={startEditCompany}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Pencil size={11} />
                  編集
                </button>
              )}
            </div>

            {editingCompany ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveCompany()}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
                {companyError && <p className="text-xs text-red-600">{companyError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveCompany}
                    disabled={companyLoading}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  >
                    <Check size={12} />
                    {companyLoading ? "保存中..." : "保存"}
                  </button>
                  <button
                    onClick={cancelEditCompany}
                    disabled={companyLoading}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <X size={12} />
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-900">{profile.companyName ?? profile.companyId}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

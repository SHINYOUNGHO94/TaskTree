"use client";

import { UserProfile, Division, Department, Team } from "@task/core";
import { Mail, Shield, Building, Layers, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { USER_ROLE_LABELS } from "../caseLabels";

type MemberTableProps = {
  isLoading: boolean;
  members: UserProfile[];
  divisions: Division[];
  departments: Department[];
  teams: Team[];
  canDeleteMember: (member: UserProfile) => boolean;
  isMutating: boolean;
  onDeleteMember: (member: UserProfile) => void;
};

const AVATAR_GRADIENTS = [
  "from-violet-400 to-purple-500",
  "from-indigo-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-sky-500",
  "from-fuchsia-400 to-pink-500",
  "from-blue-400 to-indigo-500",
];

const getAvatarGradient = (name: string): string => {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

const getRoleBadgeClass = (role: string): string => {
  switch (role) {
    case "COMPANY_ADMIN":  return "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80";
    case "DIVISION_ADMIN": return "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/80";
    case "DEPT_ADMIN":     return "bg-blue-100 text-blue-700 ring-1 ring-blue-200/80";
    case "TEAM_ADMIN":     return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80";
    case "USER":           return "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80";
    default:               return "bg-gray-100 text-gray-500 ring-1 ring-gray-200/80";
  }
};

export function MemberTable({
  isLoading,
  members,
  divisions,
  departments,
  teams,
  canDeleteMember,
  isMutating,
  onDeleteMember,
}: MemberTableProps) {
  const { t } = useTranslation("ui");

  const getDivName = (id?: string) =>
    id ? (divisions.find((d) => d.divisionId === id)?.name || id) : "---";
  const getDeptName = (id?: string) =>
    id ? (departments.find((d) => d.departmentId === id)?.name || id) : "---";
  const getTeamName = (id?: string) =>
    id ? (teams.find((tm) => tm.teamId === id)?.name || id) : "---";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wide whitespace-nowrap min-w-[200px]">{t("Member (table header)")}</th>
              <th className="px-6 py-4 font-semibold tracking-wide whitespace-nowrap min-w-[140px]">{t("Permission (header)")}</th>
              <th className="px-6 py-4 font-semibold tracking-wide whitespace-nowrap min-w-[220px]">{t("Affiliation")}</th>
              <th className="px-6 py-4 font-semibold tracking-wide whitespace-nowrap min-w-[130px]">{t("Registered Date")}</th>
              <th className="px-6 py-4 font-semibold tracking-wide whitespace-nowrap min-w-[80px]">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded-full w-24" />
                        <div className="h-2.5 bg-slate-100 rounded-full w-32" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-24" /></td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="h-2.5 bg-slate-100 rounded-full w-28" />
                      <div className="h-2 bg-slate-100 rounded-full w-20 ml-4" />
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-2.5 bg-slate-100 rounded-full w-20" /></td>
                  <td className="px-6 py-4" />
                </tr>
              ))
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Shield size={20} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 text-sm">{t("No members.")}</p>
                  </div>
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.userId} className="group hover:bg-indigo-50/40 transition-all duration-200">
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(member.name)} flex items-center justify-center text-white font-bold text-sm uppercase flex-shrink-0 shadow-sm`}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{member.name}</div>
                        <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={11} className="flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(member.role)}`}>
                      <Shield size={10} className="flex-shrink-0" />
                      {t(USER_ROLE_LABELS[member.role as keyof typeof USER_ROLE_LABELS] ?? member.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[220px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap flex-nowrap">
                        <Building size={11} className="text-slate-300 flex-shrink-0" />
                        <span className="truncate">
                          {member.divisionId && member.divisionId !== "NONE"
                            ? `${getDivName(member.divisionId)} / `
                            : ""}
                          {!member.departmentId || member.departmentId === "NONE"
                            ? t("Unassigned")
                            : getDeptName(member.departmentId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-4 border-l border-slate-100 pl-2 whitespace-nowrap flex-nowrap">
                        <Layers size={9} className="text-slate-300 flex-shrink-0" />
                        <span className="truncate">
                          {!member.teamId || member.teamId === "NONE"
                            ? t("Unassigned")
                            : getTeamName(member.teamId)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap min-w-[130px]">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[80px]">
                    {canDeleteMember(member) && (
                      <button
                        type="button"
                        onClick={() => onDeleteMember(member)}
                        disabled={isMutating}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 disabled:opacity-50 rounded-lg opacity-0 group-hover:opacity-100"
                        title={t("Delete tooltip")}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

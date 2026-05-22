"use client";

import { UserProfile, Division, Department, Team } from "@task/core";
import { Mail, Shield, Building, Layers, Trash2 } from "lucide-react";

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
  const getDivName = (id?: string) =>
    id ? (divisions.find((d) => d.divisionId === id)?.name || id) : "---";
  const getDeptName = (id?: string) =>
    id ? (departments.find((d) => d.departmentId === id)?.name || id) : "---";
  const getTeamName = (id?: string) =>
    id ? (teams.find((t) => t.teamId === id)?.name || id) : "---";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[200px] w-[25%]">メンバー</th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[100px] w-[15%]">権限</th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[220px] w-[40%]">所属</th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[130px] w-[15%]">登録日</th>
              <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[80px] w-[5%]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 whitespace-nowrap">
                  <div className="flex justify-center mb-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                  読み込み中...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 whitespace-nowrap">
                  メンバーがいません。
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.userId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold uppercase flex-shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{member.name}</div>
                        <div className="text-gray-500 text-xs flex items-center gap-1 mt-0.5 truncate">
                          <Mail size={12} className="flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[100px]">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                      <Shield size={12} className="flex-shrink-0" />
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap min-w-[220px]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 whitespace-nowrap flex-nowrap">
                        <Building size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {member.divisionId && member.divisionId !== "NONE"
                            ? `${getDivName(member.divisionId)} / `
                            : ""}
                          {!member.departmentId || member.departmentId === "NONE"
                            ? "未配属"
                            : getDeptName(member.departmentId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 ml-4 border-l border-gray-200 pl-2 whitespace-nowrap flex-nowrap">
                        <Layers size={10} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                          {!member.teamId || member.teamId === "NONE" ? "未配属" : getTeamName(member.teamId)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap min-w-[130px]">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap min-w-[80px]">
                    {canDeleteMember(member) && (
                      <button
                        type="button"
                        onClick={() => onDeleteMember(member)}
                        disabled={isMutating}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded"
                        title="削除"
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

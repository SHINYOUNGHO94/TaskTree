"use client";

import { Division, Department, Team } from "@task/core";
import { Shield, Layers, Pencil, Trash2 } from "lucide-react";
import { OrgTarget } from "./orgPermissions";

type OrgTreeProps = {
  isLoading: boolean;
  divisions: Division[];
  departments: Department[];
  teams: Team[];
  isOrgMutating: boolean;
  canManageDivision: boolean;
  canManageDepartment: (div: Division) => boolean;
  canManageTeam: (dept: Department) => boolean;
  onEdit: (target: OrgTarget) => void;
  onDeleteConfirm: (target: OrgTarget) => void;
};

export function OrgTree({
  isLoading,
  divisions,
  departments,
  teams,
  isOrgMutating,
  canManageDivision,
  canManageDepartment,
  canManageTeam,
  onEdit,
  onDeleteConfirm,
}: OrgTreeProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (divisions.length === 0 && departments.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">組織データがありません</p>;
  }

  return (
    <div className="space-y-6">
      {divisions.map((div) => (
        <div key={div.divisionId} className="space-y-3">
          <div className="group flex items-center justify-between gap-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 min-w-0">
              <Shield size={14} className="flex-shrink-0" />
              <span className="truncate">{div.name}</span>
            </div>
            {canManageDivision && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onEdit({ type: "division", id: div.divisionId, name: div.name })}
                  disabled={isOrgMutating}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 rounded"
                  title="名前を変更"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => onDeleteConfirm({ type: "division", id: div.divisionId, name: div.name })}
                  disabled={isOrgMutating}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded"
                  title="削除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="pl-4 border-l-2 border-indigo-50 ml-1.5 space-y-4">
            {departments
              .filter((d) => d.divisionId === div.divisionId)
              .map((dept) => (
                <div key={dept.departmentId} className="space-y-2">
                  <div className="group flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="truncate">{dept.name}</span>
                    </div>
                    {canManageDepartment(div) && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => onEdit({ type: "department", id: dept.departmentId, name: dept.name })}
                          disabled={isOrgMutating}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 rounded"
                          title="名前を変更"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => onDeleteConfirm({ type: "department", id: dept.departmentId, name: dept.name })}
                          disabled={isOrgMutating}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded"
                          title="削除"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="pl-3.5 border-l border-gray-100 ml-0.5 space-y-2">
                    {teams
                      .filter((t) => t.departmentId === dept.departmentId)
                      .map((team) => (
                        <div key={team.teamId} className="group flex items-center justify-between gap-1 min-w-0 pl-2">
                          <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 min-w-0">
                            <Layers size={10} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{team.name}</span>
                          </div>
                          {canManageTeam(dept) && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => onEdit({ type: "team", id: team.teamId, name: team.name })}
                                disabled={isOrgMutating}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 rounded"
                                title="名前を変更"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                onClick={() => onDeleteConfirm({ type: "team", id: team.teamId, name: team.name })}
                                disabled={isOrgMutating}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded"
                                title="削除"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {departments.filter((d) => d.divisionId === "NONE").length > 0 && (
        <div className="pt-4 border-t border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">部署（本部なし）</p>
          {departments
            .filter((d) => d.divisionId === "NONE")
            .map((dept) => (
              <div key={dept.departmentId} className="mb-3">
                <div className="group flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                    <span className="truncate">{dept.name}</span>
                  </div>
                  {canManageDivision && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => onEdit({ type: "department", id: dept.departmentId, name: dept.name })}
                        disabled={isOrgMutating}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 rounded"
                        title="名前を変更"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteConfirm({ type: "department", id: dept.departmentId, name: dept.name })}
                        disabled={isOrgMutating}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 rounded"
                        title="削除"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

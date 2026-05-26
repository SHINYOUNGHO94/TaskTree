"use client";

import { Division, Department, Team } from "@task/core";
import { Shield, Layers, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("ui");

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
            <div className="pl-5 space-y-2">
              <div className="h-6 bg-slate-50 rounded-lg w-2/3" />
              <div className="pl-4 space-y-1.5">
                <div className="h-5 bg-slate-50 rounded-lg w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (divisions.length === 0 && departments.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Shield size={18} className="text-slate-300" />
        </div>
        <p className="text-xs text-slate-400">{t("No org data")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {divisions.map((div) => (
        <div key={div.divisionId} className="space-y-2">
          <div className="group flex items-center justify-between gap-1 min-w-0 px-2 py-1.5 rounded-xl hover:bg-indigo-50/60 transition-all duration-200 -mx-1">
            <div className="flex items-center gap-2.5 text-sm font-bold text-indigo-600 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Shield size={12} className="text-indigo-500" />
              </div>
              <span className="truncate">{div.name}</span>
            </div>
            {canManageDivision && (
              <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={() => onEdit({ type: "division", id: div.divisionId, name: div.name })}
                  disabled={isOrgMutating}
                  className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                  title={t("Rename tooltip")}
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => onDeleteConfirm({ type: "division", id: div.divisionId, name: div.name })}
                  disabled={isOrgMutating}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                  title={t("Delete tooltip")}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>
          <div className="pl-4 border-l-2 border-indigo-100 ml-4 space-y-3">
            {departments
              .filter((d) => d.divisionId === div.divisionId)
              .map((dept) => (
                <div key={dept.departmentId} className="space-y-1.5">
                  <div className="group flex items-center justify-between gap-1 min-w-0 px-2 py-1.5 rounded-xl hover:bg-blue-50/60 transition-all duration-200 -mx-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <span className="truncate">{dept.name}</span>
                    </div>
                    {canManageDepartment(div) && (
                      <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={() => onEdit({ type: "department", id: dept.departmentId, name: dept.name })}
                          disabled={isOrgMutating}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                          title={t("Rename tooltip")}
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => onDeleteConfirm({ type: "department", id: dept.departmentId, name: dept.name })}
                          disabled={isOrgMutating}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                          title={t("Delete tooltip")}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="pl-3 border-l border-blue-100 ml-2 space-y-1">
                    {teams
                      .filter((tm) => tm.departmentId === dept.departmentId)
                      .map((team) => (
                        <div key={team.teamId} className="group flex items-center justify-between gap-1 min-w-0 px-2 py-1 rounded-lg hover:bg-emerald-50/50 transition-all duration-200 -mx-1">
                          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-700 min-w-0">
                            <Layers size={10} className="text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{team.name}</span>
                          </div>
                          {canManageTeam(dept) && (
                            <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                onClick={() => onEdit({ type: "team", id: team.teamId, name: team.name })}
                                disabled={isOrgMutating}
                                className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                                title={t("Rename tooltip")}
                              >
                                <Pencil size={9} />
                              </button>
                              <button
                                onClick={() => onDeleteConfirm({ type: "team", id: team.teamId, name: team.name })}
                                disabled={isOrgMutating}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                                title={t("Delete tooltip")}
                              >
                                <Trash2 size={9} />
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
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2 px-1">{t("Depts without division")}</p>
          {departments
            .filter((d) => d.divisionId === "NONE")
            .map((dept) => (
              <div key={dept.departmentId} className="mb-2">
                <div className="group flex items-center justify-between gap-1 min-w-0 px-2 py-1.5 rounded-xl hover:bg-blue-50/60 transition-all duration-200 -mx-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="truncate">{dept.name}</span>
                  </div>
                  {canManageDivision && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={() => onEdit({ type: "department", id: dept.departmentId, name: dept.name })}
                        disabled={isOrgMutating}
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                        title={t("Rename tooltip")}
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => onDeleteConfirm({ type: "department", id: dept.departmentId, name: dept.name })}
                        disabled={isOrgMutating}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 disabled:opacity-50 rounded-lg"
                        title={t("Delete tooltip")}
                      >
                        <Trash2 size={10} />
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

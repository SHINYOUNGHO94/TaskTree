"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Division, Department, Team, UserProfile, UserRole } from "@task/core";

type InviteData = {
  email: string;
  name: string;
  role: UserRole;
  divisionId?: string;
  departmentId?: string;
  teamId?: string;
};

type InviteMemberModalProps = {
  divisions: Division[];
  departments: Department[];
  teams: Team[];
  profile: UserProfile;
  isInviting: boolean;
  inviteError: string | null;
  onSubmit: (data: InviteData) => void;
  onClose: () => void;
};

export function InviteMemberModal({
  divisions,
  departments,
  teams,
  profile,
  isInviting,
  inviteError,
  onSubmit,
  onClose,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [givenName, setGivenName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [divId, setDivId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [teamId, setTeamId] = useState("");

  const profileRole = profile.role as UserRole;

  // Caller-role locking (always overrides user selection)
  const isDivisionLockedByCaller = profileRole !== UserRole.COMPANY_ADMIN;
  const isDeptLockedByCaller = profileRole === UserRole.DEPT_ADMIN || profileRole === UserRole.TEAM_ADMIN;
  const isTeamLockedByCaller = profileRole === UserRole.TEAM_ADMIN;

  // Invited-role forcing (disabled + forced to empty)
  const isDivisionDisabledByRole = role === UserRole.COMPANY_ADMIN;
  const isDeptDisabledByRole = role === UserRole.COMPANY_ADMIN || role === UserRole.DIVISION_ADMIN;
  const isTeamDisabledByRole =
    role === UserRole.COMPANY_ADMIN || role === UserRole.DIVISION_ADMIN || role === UserRole.DEPT_ADMIN;

  // Combined disabled state for UI
  const isDivisionDisabled = isDivisionLockedByCaller || isDivisionDisabledByRole;
  const isDeptDisabled = isDeptLockedByCaller || isDeptDisabledByRole;
  const isTeamDisabled = isTeamLockedByCaller || isTeamDisabledByRole;

  // Effective values: what is actually displayed and submitted
  const effectiveDivId = isDivisionDisabledByRole
    ? ""
    : isDivisionLockedByCaller
    ? profile.divisionId ?? ""
    : divId;

  const effectiveDeptId = isDeptDisabledByRole
    ? ""
    : isDeptLockedByCaller
    ? profile.departmentId ?? ""
    : deptId;

  const effectiveTeamId = isTeamDisabledByRole
    ? ""
    : isTeamLockedByCaller
    ? profile.teamId ?? ""
    : teamId;

  // Visible options filtered by caller scope
  const visibleDivisions = isDivisionLockedByCaller
    ? divisions.filter((d) => d.divisionId === profile.divisionId)
    : divisions;

  const visibleDepartments = isDeptLockedByCaller
    ? departments.filter((d) => d.departmentId === profile.departmentId)
    : isDeptDisabledByRole
    ? []
    : departments.filter(
        (d) => d.divisionId === effectiveDivId || (effectiveDivId === "" && d.divisionId === "NONE")
      );

  const visibleTeams = isTeamLockedByCaller
    ? teams.filter((t) => t.teamId === profile.teamId)
    : isTeamDisabledByRole
    ? []
    : teams.filter((t) => t.departmentId === effectiveDeptId);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (!isDivisionLockedByCaller && newRole === UserRole.COMPANY_ADMIN) {
      setDivId("");
    }
    if (
      !isDeptLockedByCaller &&
      (newRole === UserRole.COMPANY_ADMIN || newRole === UserRole.DIVISION_ADMIN)
    ) {
      setDeptId("");
    }
    if (
      !isTeamLockedByCaller &&
      (newRole === UserRole.COMPANY_ADMIN ||
        newRole === UserRole.DIVISION_ADMIN ||
        newRole === UserRole.DEPT_ADMIN)
    ) {
      setTeamId("");
    }
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!email || !familyName || !givenName) return;
    onSubmit({
      email,
      name: `${familyName} ${givenName}`,
      role,
      divisionId: effectiveDivId || undefined,
      departmentId: effectiveDeptId || undefined,
      teamId: effectiveTeamId || undefined,
    });
  };

  const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all placeholder:text-slate-300";
  const selectClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Mail size={14} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">メンバーを招待</h3>
              <p className="text-xs text-slate-500 mt-0.5">招待メールが送信され、自動的に組織に登録されます</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {inviteError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{inviteError}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>姓</label>
              <input
                type="text"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className={inputClass}
                placeholder="辛"
              />
            </div>
            <div>
              <label className={labelClass}>名</label>
              <input
                type="text"
                required
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                className={inputClass}
                placeholder="永呼"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className={labelClass}>権限</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className={selectClass}
            >
              <option value={UserRole.USER}>一般メンバー</option>
              {(profile.role === UserRole.TEAM_ADMIN ||
                profile.role === UserRole.DEPT_ADMIN ||
                profile.role === UserRole.DIVISION_ADMIN ||
                profile.role === UserRole.COMPANY_ADMIN) && (
                <option value={UserRole.TEAM_ADMIN}>チームリーダー</option>
              )}
              {(profile.role === UserRole.DEPT_ADMIN ||
                profile.role === UserRole.DIVISION_ADMIN ||
                profile.role === UserRole.COMPANY_ADMIN) && (
                <option value={UserRole.DEPT_ADMIN}>部門管理者（部長）</option>
              )}
              {(profile.role === UserRole.DIVISION_ADMIN || profile.role === UserRole.COMPANY_ADMIN) && (
                <option value={UserRole.DIVISION_ADMIN}>統括管理者（本部長）</option>
              )}
              {profile.role === UserRole.COMPANY_ADMIN && (
                <option value={UserRole.COMPANY_ADMIN}>全体管理者（社長）</option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>所属本部</label>
              <select
                value={effectiveDivId}
                onChange={(e) => {
                  setDivId(e.target.value);
                  setDeptId("");
                  setTeamId("");
                }}
                disabled={isDivisionDisabled}
                className={selectClass}
              >
                <option value="">未配属</option>
                {visibleDivisions.map((d) => (
                  <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>所属部署</label>
              <select
                value={effectiveDeptId}
                onChange={(e) => {
                  setDeptId(e.target.value);
                  setTeamId("");
                }}
                disabled={isDeptDisabled || (!effectiveDivId && !isDeptLockedByCaller && divisions.length > 0)}
                className={selectClass}
              >
                <option value="">未配属</option>
                {visibleDepartments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              所属チーム
              {role === UserRole.TEAM_ADMIN && !isTeamDisabled && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <select
              value={effectiveTeamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isTeamDisabled || !effectiveDeptId}
              required={role === UserRole.TEAM_ADMIN && !isTeamDisabled}
              className={selectClass}
            >
              <option value="">未配属</option>
              {visibleTeams.map((t) => (
                <option key={t.teamId} value={t.teamId}>{t.name}</option>
              ))}
            </select>
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
              disabled={isInviting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200/60 disabled:opacity-50 transition-all shadow-md shadow-indigo-300/20 flex justify-center items-center gap-2"
            >
              {isInviting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "招待を送信"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

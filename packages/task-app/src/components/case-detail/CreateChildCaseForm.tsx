"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  CaseDeliveryType,
  CaseService,
  CaseTargetScope,
  CaseType,
  Department,
  Division,
  OrgService,
  Team,
  UserProfile,
  UserRole,
  UserService,
} from "@task/core";
import { CASE_TARGET_SCOPE_LABELS, CASE_TYPE_LABELS, shortId } from "../dashboard/caseLabels";
import {
  CHILD_CASE_ALLOWED_SCOPES_BY_ROLE,
  CHILD_CASE_ROLE_RANK,
  USER_ROLE_LABELS,
} from "./caseDetailPermissions";

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CreateChildCaseFormProps {
  caseId: string;
  parentCaseType: CaseType;
  currentProfile: UserProfile;
  onCreated: () => Promise<void>;
  onCancel: () => void;
}

export const CreateChildCaseForm = ({
  caseId,
  parentCaseType,
  currentProfile,
  onCreated,
}: CreateChildCaseFormProps) => {
  const role = currentProfile.role;
  const isOrgUser = role === UserRole.USER || role === UserRole.GUEST;

  const allowedScopes = CHILD_CASE_ALLOWED_SCOPES_BY_ROLE[role] ?? [CaseTargetScope.USER];
  const defaultScope = allowedScopes[0] ?? CaseTargetScope.TEAM;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliveryType, setDeliveryType] = useState<CaseDeliveryType>(CaseDeliveryType.DIRECT);
  const [targetScope, setTargetScope] = useState<CaseTargetScope>(defaultScope);
  const [requiredRole, setRequiredRole] = useState<UserRole>(UserRole.USER);
  const [dueDate, setDueDate] = useState("");
  const [filterDivisionId, setFilterDivisionId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterTeamId, setFilterTeamId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [orgDivisions, setOrgDivisions] = useState<Division[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<Department[]>([]);
  const [orgTeams, setOrgTeams] = useState<Team[]>([]);
  const [orgUsers, setOrgUsers] = useState<UserProfile[]>([]);
  const [isOrgDataLoading, setIsOrgDataLoading] = useState(false);
  const [orgDataError, setOrgDataError] = useState<string | null>(null);

  const fetchOrgData = useCallback(async () => {
    setIsOrgDataLoading(true);
    setOrgDataError(null);
    try {
      const [divs, depts, teams, users] = await Promise.all([
        OrgService.getDivisions(),
        OrgService.getDepartments(),
        OrgService.getTeams(),
        UserService.getCompanyUsers(),
      ]);
      setOrgDivisions(divs);
      setOrgDepartments(depts);
      setOrgTeams(teams);
      setOrgUsers(users);
    } catch {
      setOrgDataError("組織データの取得に失敗しました。");
    } finally {
      setIsOrgDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrgData();
  }, [fetchOrgData]);

  const filteredDivisions =
    role === UserRole.DIVISION_ADMIN
      ? orgDivisions.filter((d) => d.divisionId === currentProfile.divisionId)
      : orgDivisions;

  const filteredDepartments = orgDepartments.filter((d) => {
    if (role === UserRole.DEPT_ADMIN) return d.departmentId === currentProfile.departmentId;
    if (role === UserRole.DIVISION_ADMIN) return d.divisionId === currentProfile.divisionId;
    if (filterDivisionId) return d.divisionId === filterDivisionId;
    return true;
  });

  const filteredTeams = orgTeams.filter((t) => {
    if (role === UserRole.TEAM_ADMIN) return t.teamId === currentProfile.teamId;
    if (role === UserRole.DEPT_ADMIN) return t.departmentId === currentProfile.departmentId;
    if (role === UserRole.DIVISION_ADMIN) {
      if (t.divisionId !== currentProfile.divisionId) return false;
      if (filterDepartmentId) return t.departmentId === filterDepartmentId;
      return true;
    }
    if (filterDepartmentId) return t.departmentId === filterDepartmentId;
    if (filterDivisionId) return t.divisionId === filterDivisionId;
    return true;
  });

  const filteredUsers = orgUsers.filter((u) => {
    if (isOrgUser) return u.userId === currentProfile.userId;
    if (role === UserRole.TEAM_ADMIN) return u.teamId === currentProfile.teamId;
    if (role === UserRole.DEPT_ADMIN) {
      if (u.departmentId !== currentProfile.departmentId) return false;
      if (filterTeamId) return u.teamId === filterTeamId;
      return true;
    }
    if (role === UserRole.DIVISION_ADMIN) {
      if (u.divisionId !== currentProfile.divisionId) return false;
      if (filterTeamId) return u.teamId === filterTeamId;
      if (filterDepartmentId) return u.departmentId === filterDepartmentId;
      return true;
    }
    if (filterTeamId) return u.teamId === filterTeamId;
    if (filterDepartmentId) return u.departmentId === filterDepartmentId;
    if (filterDivisionId) return u.divisionId === filterDivisionId;
    return true;
  });

  const handleScopeChange = (scope: CaseTargetScope) => {
    setTargetScope(scope);
    setFilterDivisionId("");
    setFilterDepartmentId("");
    setFilterTeamId("");
    setSelectedUserId("");
    if (scope === CaseTargetScope.USER) {
      setDeliveryType(CaseDeliveryType.DIRECT);
    }
  };

  const handleSubmit = async () => {
    if (isOrgDataLoading) {
      setError("組織データを読み込み中です。しばらくお待ちください。");
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }
    if (!description.trim()) {
      setError("内容を入力してください。");
      return;
    }

    let computedScopeId = "";
    switch (targetScope) {
      case CaseTargetScope.COMPANY:
        computedScopeId = currentProfile.companyId;
        break;
      case CaseTargetScope.DIVISION:
        computedScopeId =
          role === UserRole.DIVISION_ADMIN ? currentProfile.divisionId : filterDivisionId;
        break;
      case CaseTargetScope.DEPARTMENT:
        computedScopeId =
          role === UserRole.DEPT_ADMIN ? currentProfile.departmentId : filterDepartmentId;
        break;
      case CaseTargetScope.TEAM:
        computedScopeId =
          role === UserRole.TEAM_ADMIN ? currentProfile.teamId : filterTeamId;
        break;
      case CaseTargetScope.USER:
        computedScopeId = isOrgUser ? currentProfile.userId : selectedUserId;
        break;
    }

    if (!computedScopeId.trim()) {
      setError("送信先を選択してください。");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await CaseService.createChildCase(caseId, {
        title: title.trim(),
        description: description.trim(),
        deliveryType,
        targetScope,
        targetScopeId: computedScopeId,
        requiredRole,
        dueDate: dueDate || null,
      });
      await onCreated();
    } catch {
      setError("子案件の作成に失敗しました。再度お試しください。");
    } finally {
      setIsCreating(false);
    }
  };

  const childCaseType = parentCaseType === CaseType.PROJECT ? CaseType.STANDARD : CaseType.REQUEST;

  return (
    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
          作成される案件種別: {CASE_TYPE_LABELS[childCaseType]}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">タイトル</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="子案件のタイトルを入力"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">内容</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="子案件の詳細を入力..."
            rows={3}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">配信タイプ</label>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as CaseDeliveryType)}
              disabled={targetScope === CaseTargetScope.USER}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value={CaseDeliveryType.DIRECT}>直接依頼</option>
              {targetScope !== CaseTargetScope.USER && (
                <option value={CaseDeliveryType.OPEN}>公開</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">送信先</label>
            <select
              value={targetScope}
              onChange={(e) => handleScopeChange(e.target.value as CaseTargetScope)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {allowedScopes.map((scope) => (
                <option key={scope} value={scope}>
                  {CASE_TARGET_SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {orgDataError && <ErrorAlert message={orgDataError} />}
        {targetScope === CaseTargetScope.COMPANY && (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">会社</label>
            <div className="mt-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
              {currentProfile.companyName ?? currentProfile.companyId}
            </div>
          </div>
        )}
        {targetScope === CaseTargetScope.DIVISION && (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">事業部</label>
            {role === UserRole.DIVISION_ADMIN ? (
              <div className="mt-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {currentProfile.divisionName ?? currentProfile.divisionId}
              </div>
            ) : isOrgDataLoading ? (
              <div className="mt-1 px-3 py-2 text-sm text-gray-400">ロード中...</div>
            ) : (
              <select
                value={filterDivisionId}
                onChange={(e) => setFilterDivisionId(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="">事業部を選択...</option>
                {filteredDivisions.map((d) => (
                  <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        {targetScope === CaseTargetScope.DEPARTMENT && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">部署</label>
            {role === UserRole.DEPT_ADMIN ? (
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {currentProfile.departmentName ?? currentProfile.departmentId}
              </div>
            ) : isOrgDataLoading ? (
              <div className="px-3 py-2 text-sm text-gray-400">ロード中...</div>
            ) : (
              <>
                {role === UserRole.COMPANY_ADMIN && (
                  <select
                    value={filterDivisionId}
                    onChange={(e) => { setFilterDivisionId(e.target.value); setFilterDepartmentId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全事業部</option>
                    {filteredDivisions.map((d) => (
                      <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={filterDepartmentId}
                  onChange={(e) => setFilterDepartmentId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="">部署を選択...</option>
                  {filteredDepartments.map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
        {targetScope === CaseTargetScope.TEAM && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">チーム</label>
            {role === UserRole.TEAM_ADMIN ? (
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {currentProfile.teamName ?? currentProfile.teamId}
              </div>
            ) : isOrgDataLoading ? (
              <div className="px-3 py-2 text-sm text-gray-400">ロード中...</div>
            ) : (
              <>
                {role === UserRole.COMPANY_ADMIN && (
                  <select
                    value={filterDivisionId}
                    onChange={(e) => { setFilterDivisionId(e.target.value); setFilterDepartmentId(""); setFilterTeamId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全事業部</option>
                    {filteredDivisions.map((d) => (
                      <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                    ))}
                  </select>
                )}
                {(role === UserRole.COMPANY_ADMIN || role === UserRole.DIVISION_ADMIN) && (
                  <select
                    value={filterDepartmentId}
                    onChange={(e) => { setFilterDepartmentId(e.target.value); setFilterTeamId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全部署</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={filterTeamId}
                  onChange={(e) => setFilterTeamId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="">チームを選択...</option>
                  {filteredTeams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>{t.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
        {targetScope === CaseTargetScope.USER && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ユーザー</label>
            {isOrgUser ? (
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                {currentProfile.name}
              </div>
            ) : isOrgDataLoading ? (
              <div className="px-3 py-2 text-sm text-gray-400">ロード中...</div>
            ) : (
              <>
                {role === UserRole.COMPANY_ADMIN && (
                  <select
                    value={filterDivisionId}
                    onChange={(e) => { setFilterDivisionId(e.target.value); setFilterDepartmentId(""); setFilterTeamId(""); setSelectedUserId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全事業部</option>
                    {filteredDivisions.map((d) => (
                      <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                    ))}
                  </select>
                )}
                {(role === UserRole.COMPANY_ADMIN || role === UserRole.DIVISION_ADMIN) && (
                  <select
                    value={filterDepartmentId}
                    onChange={(e) => { setFilterDepartmentId(e.target.value); setFilterTeamId(""); setSelectedUserId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全部署</option>
                    {filteredDepartments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    ))}
                  </select>
                )}
                {(role === UserRole.COMPANY_ADMIN || role === UserRole.DIVISION_ADMIN || role === UserRole.DEPT_ADMIN) && (
                  <select
                    value={filterTeamId}
                    onChange={(e) => { setFilterTeamId(e.target.value); setSelectedUserId(""); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                  >
                    <option value="">全チーム</option>
                    {filteredTeams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>{t.name}</option>
                    ))}
                  </select>
                )}
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="">ユーザーを選択...</option>
                  {filteredUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.name || u.email || shortId(u.userId)}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">最低権限</label>
            <select
              value={requiredRole}
              onChange={(e) => setRequiredRole(e.target.value as UserRole)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white"
            >
              {(Object.entries(CHILD_CASE_ROLE_RANK) as [UserRole, number][])
                .filter(([, rank]) => rank <= (CHILD_CASE_ROLE_RANK[role] ?? 2))
                .sort(([, a], [, b]) => a - b)
                .map(([r]) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r] ?? r}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">期限（任意）</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isCreating || isOrgDataLoading}
          className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating
            ? "作成中..."
            : isOrgDataLoading
              ? "ロード中..."
              : parentCaseType === CaseType.PROJECT
                ? "標準案件を作成"
                : "依頼案件を作成"}
        </button>
      </div>
    </div>
  );
};

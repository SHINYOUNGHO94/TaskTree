"use client";

import React, { useEffect, useState } from "react";
import { UserProfile, UserService, UserRole, OrgService, Department, Team, Division } from "@task/core";
import { Users, Plus, Mail, Shield, Building, Layers } from "lucide-react";
import { useUser } from "../../../components/providers/UserProvider";

export default function TeamPage() {
  const { profile } = useUser();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFamilyName, setInviteFamilyName] = useState("");
  const [inviteGivenName, setInviteGivenName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.USER);
  const [inviteDivId, setInviteDivId] = useState("");
  const [inviteDeptId, setInviteDeptId] = useState("");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [newDivName, setNewDivName] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedDivForDept, setSelectedDivForDept] = useState("");
  const [selectedDeptForTeam, setSelectedDeptForTeam] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [membersData, divsData, deptsData, teamsData] = await Promise.all([
        UserService.getCompanyUsers(),
        OrgService.getDivisions(),
        OrgService.getDepartments(),
        OrgService.getTeams()
      ]);
      setMembers(membersData);
      setDivisions(divsData);
      setDepartments(deptsData);
      setTeams(teamsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFamilyName || !inviteGivenName) return;

    try {
      setIsInviting(true);
      setInviteError(null);
      await UserService.inviteUser({
        email: inviteEmail,
        name: `${inviteFamilyName} ${inviteGivenName}`,
        role: inviteRole,
        divisionId: inviteDivId || undefined,
        departmentId: inviteDeptId || undefined,
        teamId: inviteTeamId || undefined
      });
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteFamilyName("");
      setInviteGivenName("");
      setInviteRole(UserRole.USER);
      setInviteDivId("");
      setInviteDeptId("");
      setInviteTeamId("");
      fetchData();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateDivision = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newDivName || !profile?.companyId) return;
    try {
      setIsCreatingOrg(true);
      await OrgService.createDivision(newDivName);
      setIsDivModalOpen(false);
      setNewDivName("");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleCreateDepartment = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newDeptName || !selectedDivForDept || !profile?.companyId) return;
    try {
      setIsCreatingOrg(true);
      await OrgService.createDepartment(newDeptName, selectedDivForDept);
      setIsDeptModalOpen(false);
      setNewDeptName("");
      setSelectedDivForDept("");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleCreateTeam = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newTeamName || !selectedDeptForTeam || !profile?.companyId) return;
    try {
      setIsCreatingOrg(true);
      await OrgService.createTeam(newTeamName, selectedDeptForTeam);
      setIsTeamModalOpen(false);
      setNewTeamName("");
      setSelectedDeptForTeam("");
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  // 権限チェック: TEAM_ADMIN 以上の権限がないと組織管理ページは見れないようにする
  const allowedRoles = [UserRole.COMPANY_ADMIN, UserRole.DIVISION_ADMIN, UserRole.DEPT_ADMIN, UserRole.TEAM_ADMIN];
  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    return (
      <div className="p-8">
        <p className="text-gray-500">このページにアクセスする権限がありません。</p>
      </div>
    );
  }

  const getDivName = (id?: string) => id ? (divisions.find(d => d.divisionId === id)?.name || id) : "---";
  const getDeptName = (id?: string) => id ? (departments.find(d => d.departmentId === id)?.name || id) : "---";
  const getTeamName = (id?: string) => id ? (teams.find(t => t.teamId === id)?.name || id) : "---";

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-gray-900" />
            組織管理
            <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">
              {members.length} 名
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">会社のメンバーと組織構造（部署・チーム）を管理します。</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsDivModalOpen(true)}
            className="bg-white text-gray-700 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Shield size={16} /> 本部追加
          </button>
          <button
            onClick={() => setIsDeptModalOpen(true)}
            className="bg-white text-gray-700 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Building size={16} /> 部署追加
          </button>
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="bg-white text-gray-700 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <Layers size={16} /> チーム追加
          </button>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> メンバー招待
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building size={16} /> 組織ツリー
              </h3>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              </div>
            ) : divisions.length === 0 && departments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">組織データがありません</p>
            ) : (
              <div className="space-y-6">
                {divisions.map((div) => (
                  <div key={div.divisionId} className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                      <Shield size={14} />
                      {div.name}
                    </div>
                    <div className="pl-4 border-l-2 border-indigo-50 ml-1.5 space-y-4">
                      {departments.filter(d => d.divisionId === div.divisionId).map((dept) => (
                        <div key={dept.departmentId} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {dept.name}
                          </div>
                          <div className="pl-3.5 border-l border-gray-100 ml-0.5 space-y-2">
                            {teams.filter(t => t.departmentId === dept.departmentId).map(team => (
                              <div key={team.teamId} className="flex items-center gap-2 text-[10px] font-medium text-gray-500 pl-2">
                                <Layers size={10} className="text-gray-400" />
                                {team.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {departments.filter(d => d.divisionId === "NONE").length > 0 && (
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">部署（本部なし）</p>
                    {departments.filter(d => d.divisionId === "NONE").map((dept) => (
                      <div key={dept.departmentId} className="mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          {dept.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[200px] w-[25%]">メンバー</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[100px] w-[15%]">権限</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[220px] w-[45%]">所属</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap min-w-[130px] w-[15%]">登録日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 whitespace-nowrap">
                        <div className="flex justify-center mb-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        </div>
                        読み込み中...
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 whitespace-nowrap">
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
                                <Mail size={12} className="flex-shrink-0" /> <span className="truncate">{member.email}</span>
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
                                {member.divisionId && member.divisionId !== "NONE" ? `${getDivName(member.divisionId)} / ` : ""}
                                {!member.departmentId || member.departmentId === "NONE" ? "未配属" : getDeptName(member.departmentId)}
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
 
      {isDivModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">本部を追加</h3>
            </div>
            <form onSubmit={handleCreateDivision} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">本部名</label>
                <input
                  type="text"
                  required
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                  placeholder="例: 戦略営業本部"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDivModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isCreatingOrg ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "追加する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">メンバーを招待</h3>
              <p className="text-sm text-gray-500 mt-1">招待メールが送信され、自動的に組織に登録されます。</p>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4">
              {inviteError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {inviteError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">姓</label>
                  <input
                    type="text"
                    required
                    value={inviteFamilyName}
                    onChange={(e) => setInviteFamilyName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                    placeholder="辛"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">名</label>
                  <input
                    type="text"
                    required
                    value={inviteGivenName}
                    onChange={(e) => setInviteGivenName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                    placeholder="永呼"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                  placeholder="[EMAIL_ADDRESS]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">権限</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white"
                >
                  <option value={UserRole.USER}>一般メンバー</option>
                  {(profile?.role === UserRole.TEAM_ADMIN ||
                    profile?.role === UserRole.DEPT_ADMIN ||
                    profile?.role === UserRole.DIVISION_ADMIN ||
                    profile?.role === UserRole.COMPANY_ADMIN) && (
                    <option value={UserRole.TEAM_ADMIN}>チームリーダー</option>
                  )}
                  {(profile?.role === UserRole.DEPT_ADMIN ||
                    profile?.role === UserRole.DIVISION_ADMIN ||
                    profile?.role === UserRole.COMPANY_ADMIN) && (
                    <option value={UserRole.DEPT_ADMIN}>部門管理者（部長）</option>
                  )}
                  {(profile?.role === UserRole.DIVISION_ADMIN ||
                    profile?.role === UserRole.COMPANY_ADMIN) && (
                    <option value={UserRole.DIVISION_ADMIN}>統括管理者（本部長）</option>
                  )}
                  {profile?.role === UserRole.COMPANY_ADMIN && (
                    <option value={UserRole.COMPANY_ADMIN}>全体管理者（社長）</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">所属本部</label>
                  <select
                    value={inviteDivId}
                    onChange={(e) => {
                      setInviteDivId(e.target.value);
                      setInviteDeptId("");
                      setInviteTeamId("");
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white"
                  >
                    <option value="">未配属</option>
                    {divisions.map(d => (
                      <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">所属部署</label>
                  <select
                    value={inviteDeptId}
                    onChange={(e) => {
                      setInviteDeptId(e.target.value);
                      setInviteTeamId(""); 
                    }}
                    disabled={!inviteDivId && divisions.length > 0}
                    className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">未配属</option>
                    {departments.filter(d => d.divisionId === inviteDivId || (inviteDivId === "" && d.divisionId === "NONE")).map(d => (
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">所属チーム</label>
                <select
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  disabled={!inviteDeptId}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">未配属</option>
                  {teams.filter(t => t.departmentId === inviteDeptId).map(t => (
                    <option key={t.teamId} value={t.teamId}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isInviting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "招待を送信"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">部署を追加</h3>
            </div>
            <form onSubmit={handleCreateDepartment} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">上位の本部</label>
                <select
                  required
                  value={selectedDivForDept}
                  onChange={(e) => setSelectedDivForDept(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white"
                >
                  <option value="" disabled>本部を選択してください</option>
                  {divisions.map(d => (
                    <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">部署名</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                  placeholder="例: 開発部"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isCreatingOrg ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "追加する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">チームを追加</h3>
            </div>
            <form onSubmit={handleCreateTeam} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">上位の部署</label>
                <select
                  required
                  value={selectedDeptForTeam}
                  onChange={(e) => setSelectedDeptForTeam(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm bg-white"
                >
                  <option value="" disabled>部署を選択してください</option>
                  {departments.map(d => (
                    <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">チーム名</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:border-gray-900 focus:ring-1 transition-all text-sm"
                  placeholder="例: フロントエンドチーム"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg || !selectedDeptForTeam}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isCreatingOrg ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : "追加する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

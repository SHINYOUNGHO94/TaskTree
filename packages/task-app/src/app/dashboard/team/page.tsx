"use client";

import React, { useEffect, useState } from "react";
import { UserProfile, UserService, UserRole, OrgService, Department, Team, Division } from "@task/core";
import { Users, Plus, Shield, Building, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUser } from "../../../components/providers/UserProvider";
import { extractOrgError } from "../../../components/dashboard/team/orgError";
import { OrgTarget, ORG_ALLOWED_ROLES } from "../../../components/dashboard/team/orgPermissions";
import { OrgTree } from "../../../components/dashboard/team/OrgTree";
import { MemberTable } from "../../../components/dashboard/team/MemberTable";
import { OrgEditModal } from "../../../components/dashboard/team/OrgEditModal";
import { OrgDeleteConfirmModal } from "../../../components/dashboard/team/OrgDeleteConfirmModal";
import { CreateDivisionModal } from "../../../components/dashboard/team/CreateDivisionModal";
import { CreateDepartmentModal } from "../../../components/dashboard/team/CreateDepartmentModal";
import { CreateTeamModal } from "../../../components/dashboard/team/CreateTeamModal";
import { InviteMemberModal } from "../../../components/dashboard/team/InviteMemberModal";
import { MemberDeleteConfirmModal } from "../../../components/dashboard/team/MemberDeleteConfirmModal";

type InviteData = {
  email: string;
  name: string;
  role: UserRole;
  divisionId?: string;
  departmentId?: string;
  teamId?: string;
};

const ROLE_LEVEL: Record<UserRole, number> = {
  [UserRole.COMPANY_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 2,
  [UserRole.TEAM_ADMIN]: 1,
  [UserRole.USER]: 0,
  [UserRole.GUEST]: -1,
};

export default function TeamPage() {
  const { profile } = useUser();
  const { t } = useTranslation();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<OrgTarget | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrgTarget | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<UserProfile | null>(null);
  const [isMemberDeleteConfirmOpen, setIsMemberDeleteConfirmOpen] = useState(false);
  const [isOrgMutating, setIsOrgMutating] = useState(false);
  const [orgMutationError, setOrgMutationError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [membersData, divsData, deptsData, teamsData] = await Promise.all([
        UserService.getCompanyUsers(),
        OrgService.getDivisions(),
        OrgService.getDepartments(),
        OrgService.getTeams(),
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

  const handleInvite = async (data: InviteData) => {
    try {
      setIsInviting(true);
      setInviteError(null);
      await UserService.inviteUser(data);
      setIsInviteModalOpen(false);
      fetchData();
    } catch (err) {
      setInviteError(t(extractOrgError(err)));
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateDivision = async (name: string): Promise<void> => {
    await OrgService.createDivision(name);
    setIsDivModalOpen(false);
    fetchData();
  };

  const handleCreateDepartment = async (name: string, divisionId: string): Promise<void> => {
    await OrgService.createDepartment(name, divisionId);
    setIsDeptModalOpen(false);
    fetchData();
  };

  const handleCreateTeam = async (name: string, departmentId: string): Promise<void> => {
    const selectedDepartment = departments.find((dept) => dept.departmentId === departmentId);
    if (!selectedDepartment) throw new Error("Department not found");
    await OrgService.createTeam(name, departmentId, selectedDepartment.divisionId);
    setIsTeamModalOpen(false);
    fetchData();
  };

  const openEdit = (target: OrgTarget) => {
    setEditTarget(target);
    setOrgMutationError(null);
    setIsEditModalOpen(true);
  };

  const openDeleteConfirm = (target: OrgTarget) => {
    setDeleteTarget(target);
    setOrgMutationError(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleOrgUpdate = async (newName: string) => {
    if (!editTarget || !newName.trim()) return;
    try {
      setIsOrgMutating(true);
      setOrgMutationError(null);
      if (editTarget.type === "division") {
        await OrgService.updateDivision(editTarget.id, newName.trim());
      } else if (editTarget.type === "department") {
        await OrgService.updateDepartment(editTarget.id, newName.trim());
      } else {
        await OrgService.updateTeam(editTarget.id, newName.trim());
      }
      setIsEditModalOpen(false);
      setEditTarget(null);
      fetchData();
    } catch (err) {
      setOrgMutationError(t(extractOrgError(err)));
    } finally {
      setIsOrgMutating(false);
    }
  };

  const handleOrgDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsOrgMutating(true);
      setOrgMutationError(null);
      if (deleteTarget.type === "division") {
        await OrgService.deleteDivision(deleteTarget.id);
      } else if (deleteTarget.type === "department") {
        await OrgService.deleteDepartment(deleteTarget.id);
      } else {
        await OrgService.deleteTeam(deleteTarget.id);
      }
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setOrgMutationError(t(extractOrgError(err)));
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsOrgMutating(false);
    }
  };

  const canDeleteMember = (member: UserProfile): boolean => {
    if (!profile || member.userId === profile.userId || member.companyId !== profile.companyId) return false;

    const profileRole = profile.role as UserRole;
    const memberRole = member.role as UserRole;
    const profileLevel = ROLE_LEVEL[profileRole] ?? 0;
    const memberLevel = ROLE_LEVEL[memberRole] ?? 0;

    switch (profileRole) {
      case UserRole.COMPANY_ADMIN:
        return true;
      case UserRole.DIVISION_ADMIN:
        return member.divisionId === profile.divisionId && memberLevel < profileLevel;
      case UserRole.DEPT_ADMIN:
        return member.departmentId === profile.departmentId && memberLevel < profileLevel;
      case UserRole.TEAM_ADMIN:
        return (
          member.teamId === profile.teamId &&
          (memberRole === UserRole.USER || memberRole === UserRole.GUEST)
        );
      default:
        return false;
    }
  };

  const openDeleteMemberConfirm = (member: UserProfile) => {
    setDeleteMemberTarget(member);
    setOrgMutationError(null);
    setIsMemberDeleteConfirmOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    try {
      setIsOrgMutating(true);
      setOrgMutationError(null);
      await UserService.deleteUser(deleteMemberTarget.userId);
      setIsMemberDeleteConfirmOpen(false);
      setDeleteMemberTarget(null);
      fetchData();
    } catch (err) {
      setOrgMutationError(t(extractOrgError(err)));
    } finally {
      setIsOrgMutating(false);
    }
  };

  if (!profile || !ORG_ALLOWED_ROLES.includes(profile.role as UserRole)) {
    return (
      <div className="p-8">
        <p className="text-gray-500">このページにアクセスする権限がありません。</p>
      </div>
    );
  }

  const canManageDivision = profile.role === UserRole.COMPANY_ADMIN;
  const canManageDepartment = (div: Division) =>
    profile.role === UserRole.COMPANY_ADMIN ||
    (profile.role === UserRole.DIVISION_ADMIN && profile.divisionId === div.divisionId);
  const canManageTeam = (dept: Department) =>
    profile.role === UserRole.COMPANY_ADMIN ||
    (profile.role === UserRole.DIVISION_ADMIN && profile.divisionId === dept.divisionId) ||
    (profile.role === UserRole.DEPT_ADMIN && profile.departmentId === dept.departmentId);

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

      {orgMutationError && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
          {orgMutationError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building size={16} /> 組織ツリー
              </h3>
            </div>
            <OrgTree
              isLoading={isLoading}
              divisions={divisions}
              departments={departments}
              teams={teams}
              isOrgMutating={isOrgMutating}
              canManageDivision={canManageDivision}
              canManageDepartment={canManageDepartment}
              canManageTeam={canManageTeam}
              onEdit={openEdit}
              onDeleteConfirm={openDeleteConfirm}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <MemberTable
            isLoading={isLoading}
            members={members}
            divisions={divisions}
            departments={departments}
            teams={teams}
            canDeleteMember={canDeleteMember}
            isMutating={isOrgMutating}
            onDeleteMember={openDeleteMemberConfirm}
          />
        </div>
      </div>

      {isDivModalOpen && (
        <CreateDivisionModal
          onSubmit={handleCreateDivision}
          onClose={() => setIsDivModalOpen(false)}
        />
      )}

      {isDeptModalOpen && (
        <CreateDepartmentModal
          divisions={divisions}
          onSubmit={handleCreateDepartment}
          onClose={() => setIsDeptModalOpen(false)}
        />
      )}

      {isTeamModalOpen && (
        <CreateTeamModal
          departments={departments}
          onSubmit={handleCreateTeam}
          onClose={() => setIsTeamModalOpen(false)}
        />
      )}

      {isInviteModalOpen && (
        <InviteMemberModal
          divisions={divisions}
          departments={departments}
          teams={teams}
          profile={profile}
          isInviting={isInviting}
          inviteError={inviteError}
          onSubmit={handleInvite}
          onClose={() => { setIsInviteModalOpen(false); setInviteError(null); }}
        />
      )}

      {isEditModalOpen && editTarget && (
        <OrgEditModal
          editTarget={editTarget}
          isOrgMutating={isOrgMutating}
          error={orgMutationError}
          onSubmit={handleOrgUpdate}
          onClose={() => { setIsEditModalOpen(false); setEditTarget(null); setOrgMutationError(null); }}
        />
      )}

      {isDeleteConfirmOpen && deleteTarget && (
        <OrgDeleteConfirmModal
          deleteTarget={deleteTarget}
          isOrgMutating={isOrgMutating}
          onConfirm={handleOrgDelete}
          onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); setOrgMutationError(null); }}
        />
      )}

      {isMemberDeleteConfirmOpen && deleteMemberTarget && (
        <MemberDeleteConfirmModal
          member={deleteMemberTarget}
          isMutating={isOrgMutating}
          onConfirm={handleDeleteMember}
          onClose={() => {
            setIsMemberDeleteConfirmOpen(false);
            setDeleteMemberTarget(null);
            setOrgMutationError(null);
          }}
        />
      )}
    </div>
  );
}

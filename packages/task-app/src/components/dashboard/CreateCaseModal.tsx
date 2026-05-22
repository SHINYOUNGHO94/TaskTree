"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, CheckCircle, Loader2, RefreshCw, X } from 'lucide-react';
import {
  CaseDeliveryType,
  CaseService,
  CaseTargetScope,
  CaseType,
  CreateRootCaseInput,
  Department,
  Division,
  OrgService,
  Team,
  UserProfile,
  UserRole,
  UserService,
} from '@task/core';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile?: UserProfile | null;
  userId: string;
}

interface FormValues {
  title: string;
  description: string;
  dueDate: string;
  caseType: CaseType;
}

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.GUEST]: 'GUEST',
  [UserRole.USER]: 'USER',
  [UserRole.TEAM_ADMIN]: 'TEAM_ADMIN',
  [UserRole.DEPT_ADMIN]: 'DEPT_ADMIN',
  [UserRole.DIVISION_ADMIN]: 'DIVISION_ADMIN',
  [UserRole.COMPANY_ADMIN]: 'COMPANY_ADMIN',
};

const ALLOWED_TARGET_SCOPES_BY_ROLE: Record<UserRole, CaseTargetScope[]> = {
  [UserRole.COMPANY_ADMIN]: [
    CaseTargetScope.COMPANY,
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DIVISION_ADMIN]: [
    CaseTargetScope.DIVISION,
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.DEPT_ADMIN]: [
    CaseTargetScope.DEPARTMENT,
    CaseTargetScope.TEAM,
    CaseTargetScope.USER,
  ],
  [UserRole.TEAM_ADMIN]: [CaseTargetScope.TEAM, CaseTargetScope.USER],
  [UserRole.USER]: [CaseTargetScope.USER],
  [UserRole.GUEST]: [CaseTargetScope.USER],
};

const SCOPE_LABELS: Record<CaseTargetScope, string> = {
  [CaseTargetScope.COMPANY]: '全社',
  [CaseTargetScope.DIVISION]: '部門',
  [CaseTargetScope.DEPARTMENT]: '部署',
  [CaseTargetScope.TEAM]: 'チーム',
  [CaseTargetScope.USER]: 'ユーザー',
};

function getDefaultScope(role: UserRole): CaseTargetScope {
  const allowed = ALLOWED_TARGET_SCOPES_BY_ROLE[role] ?? [CaseTargetScope.USER];
  return allowed[0] ?? CaseTargetScope.USER;
}

function getScopeRequiredError(scope: CaseTargetScope): string {
  switch (scope) {
    case CaseTargetScope.DIVISION:
      return '送信先の部門を選択してください。';
    case CaseTargetScope.DEPARTMENT:
      return '送信先の部署を選択してください。';
    case CaseTargetScope.TEAM:
      return '送信先のチームを選択してください。';
    case CaseTargetScope.USER:
      return '送信先のユーザーを選択してください。';
    default:
      return '送信先を選択してください。';
  }
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
  userId,
}) => {
  const userRole = profile?.role ?? UserRole.USER;
  const allowedScopes = ALLOWED_TARGET_SCOPES_BY_ROLE[userRole] ?? [CaseTargetScope.USER];
  const isOrgUser = userRole === UserRole.USER || userRole === UserRole.GUEST;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      caseType: CaseType.REQUEST,
    },
  });

  const selectedCaseType = watch('caseType');

  // Delivery / scope / role state
  const [deliveryType, setDeliveryType] = useState<CaseDeliveryType>(CaseDeliveryType.DIRECT);
  const [targetScope, setTargetScope] = useState<CaseTargetScope>(() => getDefaultScope(userRole));
  const [requiredRole, setRequiredRole] = useState<UserRole>(UserRole.USER);

  // Cascade selectors (only used for roles that need explicit selection)
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterTeamId, setFilterTeamId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Org data
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Modal result
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  // Org data fetch — no per-promise error swallowing
  const fetchOrgData = useCallback(async () => {
    setOrgLoading(true);
    setOrgError(null);
    try {
      const [divs, depts, tms, usrs] = await Promise.all([
        OrgService.getDivisions(),
        OrgService.getDepartments(),
        OrgService.getTeams(),
        UserService.getCompanyUsers(),
      ]);
      setDivisions(divs);
      setDepartments(depts);
      setTeams(tms);
      setCompanyUsers(usrs);
    } catch {
      setOrgError('組織情報の取得に失敗しました。再試行してください。');
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (isOrgUser) return;
    void fetchOrgData();
  }, [isOpen, isOrgUser, fetchOrgData]);

  // Reset cascade selectors when targetScope changes
  useEffect(() => {
    setFilterDivisionId('');
    setFilterDepartmentId('');
    setFilterTeamId('');
    setSelectedUserId('');
    if (targetScope === CaseTargetScope.USER) {
      setDeliveryType(CaseDeliveryType.DIRECT);
      setRequiredRole(UserRole.USER);
    }
  }, [targetScope]);

  // Reset downstream when division filter changes
  useEffect(() => {
    setFilterDepartmentId('');
    setFilterTeamId('');
    setSelectedUserId('');
  }, [filterDivisionId]);

  // Reset downstream when department filter changes
  useEffect(() => {
    setFilterTeamId('');
    setSelectedUserId('');
  }, [filterDepartmentId]);

  // Reset downstream when team filter changes
  useEffect(() => {
    setSelectedUserId('');
  }, [filterTeamId]);

  // ── Derived role-filtered lists ──────────────────────────────────────────

  const filteredDivisions = useMemo<Division[]>(() => {
    if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      return divisions.filter((d) => d.divisionId === profile.divisionId);
    }
    return divisions;
  }, [divisions, userRole, profile]);

  const filteredDepartments = useMemo<Department[]>(() => {
    let result = departments;
    // DEPT_ADMIN: only own dept
    if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
      return result.filter((d) => d.departmentId === profile.departmentId);
    }
    // DIVISION_ADMIN: scope to own division (no extra filter needed)
    if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      result = result.filter((d) => d.divisionId === profile.divisionId);
    }
    // COMPANY_ADMIN with division filter applied
    if (filterDivisionId) {
      result = result.filter((d) => d.divisionId === filterDivisionId);
    }
    return result;
  }, [departments, userRole, profile, filterDivisionId]);

  const filteredTeams = useMemo<Team[]>(() => {
    let result = teams;
    // TEAM_ADMIN: only own team
    if (userRole === UserRole.TEAM_ADMIN && profile?.teamId && profile.teamId !== 'NONE') {
      return result.filter((t) => t.teamId === profile.teamId);
    }
    // DEPT_ADMIN: scope to own dept
    if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
      result = result.filter((t) => t.departmentId === profile.departmentId);
    } else if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      result = result.filter((t) => t.divisionId === profile.divisionId);
    }
    // Additional narrowing from department/division filter
    if (filterDepartmentId) {
      result = result.filter((t) => t.departmentId === filterDepartmentId);
    } else if (filterDivisionId) {
      result = result.filter((t) => t.divisionId === filterDivisionId);
    }
    return result;
  }, [teams, userRole, profile, filterDivisionId, filterDepartmentId]);

  const filteredUsers = useMemo<UserProfile[]>(() => {
    if (isOrgUser) return [];
    let result = companyUsers;
    if (userRole === UserRole.TEAM_ADMIN && profile?.teamId && profile.teamId !== 'NONE') {
      result = result.filter((u) => u.teamId === profile.teamId);
    } else if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
      result = result.filter((u) => u.departmentId === profile.departmentId);
    } else if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      result = result.filter((u) => u.divisionId === profile.divisionId);
    }
    if (filterTeamId) {
      result = result.filter((u) => u.teamId === filterTeamId);
    } else if (filterDepartmentId) {
      result = result.filter((u) => u.departmentId === filterDepartmentId);
    } else if (filterDivisionId) {
      result = result.filter((u) => u.divisionId === filterDivisionId);
    }
    return result;
  }, [companyUsers, isOrgUser, userRole, profile, filterDivisionId, filterDepartmentId, filterTeamId]);

  // ── targetScopeId: no auto fallback except for "own scope" cases ─────────
  //
  // Auto: role's own scope (no explicit selection needed)
  // Required: selecting into another org unit — must be explicitly chosen
  //
  const computedTargetScopeId = useMemo<string>(() => {
    switch (targetScope) {
      case CaseTargetScope.COMPANY:
        return profile?.companyId ?? '';

      case CaseTargetScope.DIVISION:
        // DIVISION_ADMIN → auto own division; others must pick
        if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
          return profile.divisionId;
        }
        return filterDivisionId;

      case CaseTargetScope.DEPARTMENT:
        // DEPT_ADMIN → auto own dept; others must pick
        if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
          return profile.departmentId;
        }
        return filterDepartmentId;

      case CaseTargetScope.TEAM:
        // TEAM_ADMIN → auto own team; others must pick
        if (userRole === UserRole.TEAM_ADMIN && profile?.teamId && profile.teamId !== 'NONE') {
          return profile.teamId;
        }
        return filterTeamId;

      case CaseTargetScope.USER:
        // USER/GUEST → auto self; admins must explicitly pick a user
        if (isOrgUser) return userId;
        return selectedUserId;

      default:
        return '';
    }
  }, [targetScope, userRole, profile, userId, isOrgUser, filterDivisionId, filterDepartmentId, filterTeamId, selectedUserId]);

  // requiredRole: forced to USER when targeting a specific user
  const effectiveRequiredRole = targetScope === CaseTargetScope.USER ? UserRole.USER : requiredRole;

  const allowedRequiredRoles = useMemo<UserRole[]>(() => {
    const creatorRank = ROLE_RANK[userRole] ?? 2;
    return (Object.keys(ROLE_RANK) as UserRole[])
      .filter((r) => ROLE_RANK[r] <= creatorRank)
      .sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
  }, [userRole]);

  // ── Human-readable target summary for confirmation ────────────────────────
  const targetSummaryText = useMemo<string>(() => {
    const id = computedTargetScopeId;
    switch (targetScope) {
      case CaseTargetScope.COMPANY:
        return id ? `${profile?.companyName ?? '自社全体'}（全社）` : '';
      case CaseTargetScope.DIVISION: {
        if (!id) return '';
        const div = divisions.find((d) => d.divisionId === id);
        const name = div?.name ?? profile?.divisionName ?? id;
        return `${name}（部門）`;
      }
      case CaseTargetScope.DEPARTMENT: {
        if (!id) return '';
        const dept = departments.find((d) => d.departmentId === id);
        const name = dept?.name ?? profile?.departmentName ?? id;
        return `${name}（部署）`;
      }
      case CaseTargetScope.TEAM: {
        if (!id) return '';
        const team = teams.find((t) => t.teamId === id);
        const name = team?.name ?? profile?.teamName ?? id;
        return `${name}（チーム）`;
      }
      case CaseTargetScope.USER: {
        if (!id) return '';
        if (isOrgUser) return `${profile?.name ?? '自分'}（自分）`;
        const u = companyUsers.find((u) => u.userId === id);
        return u ? `${u.name}（ユーザー）` : id;
      }
      default:
        return '';
    }
  }, [targetScope, computedTargetScopeId, profile, divisions, departments, teams, companyUsers, isOrgUser]);

  // ── Selector visibility flags ─────────────────────────────────────────────

  const needsOrgData =
    targetScope === CaseTargetScope.DIVISION ||
    targetScope === CaseTargetScope.DEPARTMENT ||
    targetScope === CaseTargetScope.TEAM ||
    targetScope === CaseTargetScope.USER;

  // Division selector: only COMPANY_ADMIN needs to pick (others have fixed division)
  const showDivisionSelector = needsOrgData && userRole === UserRole.COMPANY_ADMIN;

  // Show own-division info label for DIVISION_ADMIN targeting DIVISION
  const showDivisionAutoLabel =
    userRole === UserRole.DIVISION_ADMIN &&
    targetScope === CaseTargetScope.DIVISION &&
    !!profile?.divisionId &&
    profile.divisionId !== 'NONE';

  // Department selector/filter: shown unless role is scoped to own dept or below
  const showDeptSelector =
    (targetScope === CaseTargetScope.DEPARTMENT ||
      targetScope === CaseTargetScope.TEAM ||
      targetScope === CaseTargetScope.USER) &&
    userRole !== UserRole.DEPT_ADMIN &&
    userRole !== UserRole.TEAM_ADMIN;

  // Show own-dept info label for DEPT_ADMIN targeting DEPARTMENT
  const showDeptAutoLabel =
    userRole === UserRole.DEPT_ADMIN &&
    targetScope === CaseTargetScope.DEPARTMENT &&
    !!profile?.departmentId &&
    profile.departmentId !== 'NONE';

  // Team selector/filter: shown unless role is scoped to own team
  const showTeamSelector =
    (targetScope === CaseTargetScope.TEAM || targetScope === CaseTargetScope.USER) &&
    userRole !== UserRole.TEAM_ADMIN;

  // Show own-team info label for TEAM_ADMIN targeting TEAM
  const showTeamAutoLabel =
    userRole === UserRole.TEAM_ADMIN &&
    targetScope === CaseTargetScope.TEAM &&
    !!profile?.teamId &&
    profile.teamId !== 'NONE';

  // User selector: shown for admins targeting USER
  const showUserSelector = targetScope === CaseTargetScope.USER && !isOrgUser;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    reset({ title: '', description: '', dueDate: '', caseType: CaseType.REQUEST });
    setSubmitError(null);
    setSucceeded(false);
    setDeliveryType(CaseDeliveryType.DIRECT);
    setTargetScope(getDefaultScope(userRole));
    setRequiredRole(UserRole.USER);
    setFilterDivisionId('');
    setFilterDepartmentId('');
    setFilterTeamId('');
    setSelectedUserId('');
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);

    if (!computedTargetScopeId) {
      setSubmitError(getScopeRequiredError(targetScope));
      return;
    }

    const input: CreateRootCaseInput = {
      title: data.title.trim(),
      description: data.description.trim(),
      caseType: data.caseType,
      deliveryType,
      targetScope,
      targetScopeId: computedTargetScopeId,
      requiredRole: effectiveRequiredRole,
      dueDate: data.dueDate || null,
    };

    try {
      await CaseService.createCase(input);
      setSucceeded(true);
      onSuccess();
    } catch (error) {
      console.error('Failed to create case', error);
      setSubmitError('案件の作成に失敗しました。再度お試しください。');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* ── Header ── */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100/80 bg-gray-50/50">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedCaseType === CaseType.PROJECT
                    ? 'PROJECT 案件作成'
                    : selectedCaseType === CaseType.STANDARD
                      ? 'STANDARD 案件作成'
                      : 'REQUEST 案件作成'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {selectedCaseType === CaseType.PROJECT
                    ? '複数の STANDARD に分解できる大型案件'
                    : selectedCaseType === CaseType.STANDARD
                      ? '複数の REQUEST に分解できる社内案件'
                      : '特定の組織・ユーザーへの依頼'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Success ── */}
            {succeeded ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-10 flex flex-col items-center gap-4 text-center"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 mb-2">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">案件を作成しました</p>
                  <p className="text-xs text-gray-400 mt-1">ダッシュボードの一覧に追加されました。</p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm"
                >
                  閉じる
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
              >
                {submitError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    {submitError}
                  </div>
                )}

                {/* ── Case type ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">案件タイプ</label>
                  <div className="bg-gray-100 p-1 rounded-xl flex gap-1 border border-gray-200/20">
                    {([CaseType.REQUEST, CaseType.STANDARD, CaseType.PROJECT] as CaseType[]).map((ct) => (
                      <label
                        key={ct}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                          selectedCaseType === ct
                            ? ct === CaseType.PROJECT
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                            : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('caseType')}
                          value={ct}
                          className="sr-only"
                        />
                        {ct}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Title ── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">タイトル</label>
                  <input
                    {...register('title', {
                      required: 'タイトルを入力してください。',
                      validate: (v) => v.trim().length > 0 || 'タイトルを入力してください。',
                    })}
                    placeholder="案件のタイトルを入力"
                    className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm bg-white"
                  />
                  {errors.title && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.title.message}</p>
                  )}
                </div>

                {/* ── Description ── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">内容</label>
                  <textarea
                    {...register('description', {
                      required: '内容を入力してください。',
                      validate: (v) => v.trim().length > 0 || '内容を入力してください。',
                    })}
                    placeholder="案件の詳細を入力..."
                    className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all h-24 resize-none shadow-sm bg-white"
                  />
                  {errors.description && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.description.message}</p>
                  )}
                </div>

                {/* ── Delivery type ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">配信方式</label>
                  <div className="bg-gray-100 p-1 rounded-xl flex gap-1 border border-gray-200/20">
                    {([CaseDeliveryType.DIRECT, CaseDeliveryType.OPEN] as CaseDeliveryType[]).map((dt) => (
                      <label
                        key={dt}
                        className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg transition-all select-none ${
                          targetScope === CaseTargetScope.USER
                            ? 'opacity-40 cursor-not-allowed'
                            : 'cursor-pointer'
                        } ${
                          deliveryType === dt
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                            : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          checked={deliveryType === dt}
                          onChange={() => {
                            if (targetScope !== CaseTargetScope.USER) setDeliveryType(dt);
                          }}
                          disabled={targetScope === CaseTargetScope.USER}
                        />
                        <span className="text-xs font-bold">{dt}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {dt === CaseDeliveryType.DIRECT ? '特定の相手へ直接' : '権限範囲内に公開'}
                        </span>
                      </label>
                    ))}
                  </div>
                  {targetScope === CaseTargetScope.USER && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      ユーザー宛ての案件は DIRECT に固定されます。
                    </p>
                  )}
                </div>

                {/* ── Target scope buttons ── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">送信先スコープ</label>
                  {allowedScopes.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {allowedScopes.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setTargetScope(scope)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            targetScope === scope
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {SCOPE_LABELS[scope]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      {SCOPE_LABELS[allowedScopes[0] ?? CaseTargetScope.USER]}（固定）
                    </p>
                  )}
                </div>

                {/* ── Org loading / error ── */}
                {needsOrgData && !isOrgUser && (
                  <>
                    {orgLoading && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 py-2 px-1">
                        <Loader2 size={14} className="animate-spin" />
                        組織情報を読み込み中...
                      </div>
                    )}
                    {orgError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={13} className="shrink-0 mt-0.5" />
                          <span>{orgError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchOrgData}
                          className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 underline shrink-0 whitespace-nowrap"
                        >
                          <RefreshCw size={11} />
                          再試行
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ── Scope selectors ── */}
                {(!needsOrgData || isOrgUser || (!orgLoading && !orgError)) && (
                  <div className="space-y-3">

                    {/* COMPANY: auto label */}
                    {targetScope === CaseTargetScope.COMPANY && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        送信先（自動）: <span className="font-bold">{profile?.companyName ?? '自社全体'}</span>
                      </div>
                    )}

                    {/* DIVISION auto label (DIVISION_ADMIN own scope) */}
                    {showDivisionAutoLabel && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        送信先（自動）: <span className="font-bold">{profile?.divisionName ?? profile?.divisionId}</span>（部門）
                      </div>
                    )}

                    {/* Division selector — only COMPANY_ADMIN */}
                    {showDivisionSelector && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500">
                          {targetScope === CaseTargetScope.DIVISION
                            ? '送信先の部門 *'
                            : '部門（絞り込み・任意）'}
                        </label>
                        <select
                          value={filterDivisionId}
                          onChange={(e) => setFilterDivisionId(e.target.value)}
                          className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-xs bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.DIVISION
                              ? '-- 部門を選択してください --'
                              : '-- すべての部門 --'}
                          </option>
                          {filteredDivisions.map((d) => (
                            <option key={d.divisionId} value={d.divisionId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {filteredDivisions.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-gray-400">部門データがありません。</p>
                        )}
                      </div>
                    )}

                    {/* DEPARTMENT auto label (DEPT_ADMIN own scope) */}
                    {showDeptAutoLabel && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        送信先（自動）: <span className="font-bold">{profile?.departmentName ?? profile?.departmentId}</span>（部署）
                      </div>
                    )}

                    {/* Department selector */}
                    {showDeptSelector && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500">
                          {targetScope === CaseTargetScope.DEPARTMENT
                            ? '送信先の部署 *'
                            : '部署（絞り込み・任意）'}
                        </label>
                        <select
                          value={filterDepartmentId}
                          onChange={(e) => setFilterDepartmentId(e.target.value)}
                          className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-xs bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.DEPARTMENT
                              ? '-- 部署を選択してください --'
                              : '-- すべての部署 --'}
                          </option>
                          {filteredDepartments.map((d) => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {filteredDepartments.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-gray-400">
                            {filterDivisionId ? '選択した部門に部署データがありません。' : '部署データがありません。'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* TEAM auto label (TEAM_ADMIN own scope) */}
                    {showTeamAutoLabel && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        送信先（自動）: <span className="font-bold">{profile?.teamName ?? profile?.teamId}</span>（チーム）
                      </div>
                    )}

                    {/* Team selector */}
                    {showTeamSelector && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500">
                          {targetScope === CaseTargetScope.TEAM
                            ? '送信先のチーム *'
                            : 'チーム（絞り込み・任意）'}
                        </label>
                        <select
                          value={filterTeamId}
                          onChange={(e) => setFilterTeamId(e.target.value)}
                          className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-xs bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.TEAM
                              ? '-- チームを選択してください --'
                              : '-- すべてのチーム --'}
                          </option>
                          {filteredTeams.map((t) => (
                            <option key={t.teamId} value={t.teamId}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {filteredTeams.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-gray-400">
                            {filterDepartmentId ? '選択した部署にチームデータがありません。' : 'チームデータがありません。'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* USER auto label (USER/GUEST) */}
                    {targetScope === CaseTargetScope.USER && isOrgUser && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
                        送信先（自動）: <span className="font-bold">{profile?.name ?? '自分'}（自分のみ）</span>
                      </div>
                    )}

                    {/* User selector (admins) */}
                    {showUserSelector && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-500">
                          送信先のユーザー *
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-xs bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm"
                        >
                          <option value="">-- ユーザーを選択してください --</option>
                          {filteredUsers.map((u) => (
                            <option key={u.userId} value={u.userId}>
                              {u.name}（{u.email}）
                            </option>
                          ))}
                        </select>
                        {filteredUsers.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-gray-400">
                            {filterTeamId
                              ? '選択したチームにユーザーがいません。'
                              : filterDepartmentId
                                ? '選択した部署にユーザーがいません。'
                                : 'ユーザーデータがありません。'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Required role (only when scope is not USER) ── */}
                {targetScope !== CaseTargetScope.USER && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      閲覧に必要な権限
                      {deliveryType === CaseDeliveryType.OPEN && (
                        <span className="ml-1 text-amber-500 font-normal normal-case">（OPEN 案件では重要）</span>
                      )}
                    </label>
                    <select
                      value={requiredRole}
                      onChange={(e) => setRequiredRole(e.target.value as UserRole)}
                      className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm"
                    >
                      {allowedRequiredRoles.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-400">
                      選択した送信先内でこの権限以上のユーザーが閲覧できます。
                    </p>
                  </div>
                )}

                {/* ── Due date ── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" /> 期限（任意）
                  </label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm bg-white"
                  />
                </div>

                {/* ── Send summary confirmation ── */}
                {targetSummaryText && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                      送信先確認
                    </span>
                    <div className="text-xs font-bold text-indigo-800">{targetSummaryText}</div>
                    <div className="text-[10px] text-indigo-400 space-x-2">
                      <span>
                        配信:{' '}
                        <span className="font-semibold text-indigo-600">{deliveryType}</span>
                      </span>
                      {targetScope !== CaseTargetScope.USER && (
                        <span>
                          閲覧権限:{' '}
                          <span className="font-semibold text-indigo-600">{effectiveRequiredRole}以上</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                  >
                    {isSubmitting ? '送信中...' : '案件を作成する'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

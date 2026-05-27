"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
import { CASE_DELIVERY_TYPE_LABELS, CASE_TYPE_LABELS, USER_ROLE_LABELS } from './caseLabels';
import { RichEditor, type RichEditorOutput } from '../editor/RichEditor';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profile?: UserProfile | null;
  userId: string;
}

interface FormValues {
  title: string;
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

const REQUEST_TEMPLATE_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Request Details' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Expected Outcome' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Deadline / Priority' }] },
    { type: 'paragraph' },
  ],
});

const STANDARD_TEMPLATE_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Background' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Scope' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Expected Outcome' }] },
    { type: 'paragraph' },
  ],
});

const PROJECT_TEMPLATE_JSON = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Goals' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Schedule' }] },
    { type: 'paragraph' },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Team' }] },
    { type: 'paragraph' },
  ],
});

const TEMPLATE_TEXT: Record<CaseType, string> = {
  [CaseType.REQUEST]: 'Request Details\nExpected Outcome\nDeadline / Priority',
  [CaseType.STANDARD]: 'Background\nScope\nExpected Outcome',
  [CaseType.PROJECT]: 'Overview\nGoals\nSchedule\nTeam',
};

const SCOPE_LABELS: Record<CaseTargetScope, string> = {
  [CaseTargetScope.COMPANY]: 'Company',
  [CaseTargetScope.DIVISION]: 'Division',
  [CaseTargetScope.DEPARTMENT]: 'Department',
  [CaseTargetScope.TEAM]: 'Team',
  [CaseTargetScope.USER]: 'User',
};

function getDefaultScope(role: UserRole): CaseTargetScope {
  const allowed = ALLOWED_TARGET_SCOPES_BY_ROLE[role] ?? [CaseTargetScope.USER];
  return allowed[0] ?? CaseTargetScope.USER;
}

function getScopeRequiredError(scope: CaseTargetScope): string {
  switch (scope) {
    case CaseTargetScope.DIVISION:   return 'Please select a target division.';
    case CaseTargetScope.DEPARTMENT: return 'Please select a target department.';
    case CaseTargetScope.TEAM:       return 'Please select a target team.';
    case CaseTargetScope.USER:       return 'Please select a target user.';
    default:                         return 'Please select a target.';
  }
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
  userId,
}) => {
  const { t } = useTranslation('ui');
  const userRole = profile?.role ?? UserRole.USER;
  const roleAllowedScopes = ALLOWED_TARGET_SCOPES_BY_ROLE[userRole] ?? [CaseTargetScope.USER];
  const isOrgUser = userRole === UserRole.USER || userRole === UserRole.GUEST;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      dueDate: '',
      caseType: CaseType.REQUEST,
    },
  });

  const selectedCaseType = watch('caseType');

  const REQUEST_SCOPES: CaseTargetScope[] = [CaseTargetScope.TEAM, CaseTargetScope.USER];
  const allowedScopes = selectedCaseType === CaseType.REQUEST
    ? roleAllowedScopes.filter((s) => REQUEST_SCOPES.includes(s))
    : roleAllowedScopes;

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
  const [richDesc, setRichDesc] = useState<RichEditorOutput>({ description: '', descriptionFormat: 'tiptap_json', descriptionText: '' });
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Org data fetch
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
      setOrgError('Failed to load org info. Please retry.');
    } finally {
      setOrgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (isOrgUser) return;
    void fetchOrgData();
  }, [isOpen, isOrgUser, fetchOrgData]);

  // Reset targetScope when caseType changes and current scope is no longer allowed
  useEffect(() => {
    if (!allowedScopes.includes(targetScope)) {
      setTargetScope(allowedScopes[0] ?? CaseTargetScope.USER);
    }
  }, [allowedScopes, targetScope]);

  // Reset cascade selectors when targetScope changes
  useEffect(() => {
    setFilterDivisionId('');
    setFilterDepartmentId('');
    setFilterTeamId('');
    setSelectedUserId('');
    if (targetScope === CaseTargetScope.USER) {
      setDeliveryType(CaseDeliveryType.DIRECT);
      setRequiredRole(UserRole.USER);
    } else if (targetScope === CaseTargetScope.TEAM && selectedCaseType === CaseType.REQUEST) {
      setDeliveryType(CaseDeliveryType.OPEN);
    }
  }, [targetScope, selectedCaseType]);

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
    if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
      return result.filter((d) => d.departmentId === profile.departmentId);
    }
    if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      result = result.filter((d) => d.divisionId === profile.divisionId);
    }
    if (filterDivisionId) {
      result = result.filter((d) => d.divisionId === filterDivisionId);
    }
    return result;
  }, [departments, userRole, profile, filterDivisionId]);

  const filteredTeams = useMemo<Team[]>(() => {
    let result = teams;
    if (userRole === UserRole.TEAM_ADMIN && profile?.teamId && profile.teamId !== 'NONE') {
      return result.filter((t) => t.teamId === profile.teamId);
    }
    if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
      result = result.filter((t) => t.departmentId === profile.departmentId);
    } else if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
      result = result.filter((t) => t.divisionId === profile.divisionId);
    }
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

  // ── targetScopeId ─────────────────────────────────────────────────────────
  const computedTargetScopeId = useMemo<string>(() => {
    switch (targetScope) {
      case CaseTargetScope.COMPANY:
        return profile?.companyId ?? '';
      case CaseTargetScope.DIVISION:
        if (userRole === UserRole.DIVISION_ADMIN && profile?.divisionId && profile.divisionId !== 'NONE') {
          return profile.divisionId;
        }
        return filterDivisionId;
      case CaseTargetScope.DEPARTMENT:
        if (userRole === UserRole.DEPT_ADMIN && profile?.departmentId && profile.departmentId !== 'NONE') {
          return profile.departmentId;
        }
        return filterDepartmentId;
      case CaseTargetScope.TEAM:
        if (userRole === UserRole.TEAM_ADMIN && profile?.teamId && profile.teamId !== 'NONE') {
          return profile.teamId;
        }
        return filterTeamId;
      case CaseTargetScope.USER:
        if (isOrgUser) return userId;
        return selectedUserId;
      default:
        return '';
    }
  }, [targetScope, userRole, profile, userId, isOrgUser, filterDivisionId, filterDepartmentId, filterTeamId, selectedUserId]);

  const effectiveSubmitScope = useMemo<{ scope: CaseTargetScope; scopeId: string }>(() => {
    if (
      deliveryType === CaseDeliveryType.OPEN &&
      !computedTargetScopeId &&
      targetScope !== CaseTargetScope.USER
    ) {
      return { scope: CaseTargetScope.COMPANY, scopeId: profile?.companyId ?? '' };
    }
    return { scope: targetScope, scopeId: computedTargetScopeId };
  }, [deliveryType, computedTargetScopeId, targetScope, profile]);

  const effectiveRequiredRole = effectiveSubmitScope.scope === CaseTargetScope.USER ? UserRole.USER : requiredRole;

  const allowedRequiredRoles = useMemo<UserRole[]>(() => {
    const creatorRank = ROLE_RANK[userRole] ?? 2;
    return (Object.keys(ROLE_RANK) as UserRole[])
      .filter((r) => ROLE_RANK[r] <= creatorRank)
      .sort((a, b) => ROLE_RANK[a] - ROLE_RANK[b]);
  }, [userRole]);

  // ── Human-readable target summary ─────────────────────────────────────────
  const targetSummaryText = useMemo<string>(() => {
    const { scope: effScope, scopeId: effId } = effectiveSubmitScope;
    const isOpenFallback =
      deliveryType === CaseDeliveryType.OPEN &&
      effScope === CaseTargetScope.COMPANY &&
      targetScope !== CaseTargetScope.COMPANY;

    switch (effScope) {
      case CaseTargetScope.COMPANY:
        if (!effId) return '';
        return isOpenFallback
          ? `${profile?.companyName ?? t('own company')} ${t('(company-wide, no scope)')}`
          : `${profile?.companyName ?? t('own company')} ${t('(company-wide)')}`;
      case CaseTargetScope.DIVISION: {
        if (!effId) return '';
        const div = divisions.find((d) => d.divisionId === effId);
        const name = div?.name ?? profile?.divisionName ?? effId;
        return `${name} ${t('(division)')}`;
      }
      case CaseTargetScope.DEPARTMENT: {
        if (!effId) return '';
        const dept = departments.find((d) => d.departmentId === effId);
        const name = dept?.name ?? profile?.departmentName ?? effId;
        return `${name} ${t('(department)')}`;
      }
      case CaseTargetScope.TEAM: {
        if (!effId) return '';
        const team = teams.find((tm) => tm.teamId === effId);
        const name = team?.name ?? profile?.teamName ?? effId;
        return `${name} ${t('(team)')}`;
      }
      case CaseTargetScope.USER: {
        const id = computedTargetScopeId;
        if (!id) return '';
        if (isOrgUser) return `${profile?.name ?? t('self')} ${t('(self only)')}`;
        const u = companyUsers.find((u) => u.userId === id);
        return u ? `${u.name} ${t('(user)')}` : id;
      }
      default:
        return '';
    }
  }, [effectiveSubmitScope, targetScope, deliveryType, computedTargetScopeId, profile, divisions, departments, teams, companyUsers, isOrgUser, t]);

  // ── Selector visibility flags ─────────────────────────────────────────────

  const needsOrgData =
    targetScope === CaseTargetScope.DIVISION ||
    targetScope === CaseTargetScope.DEPARTMENT ||
    targetScope === CaseTargetScope.TEAM ||
    targetScope === CaseTargetScope.USER;

  const showDivisionSelector = needsOrgData && userRole === UserRole.COMPANY_ADMIN;

  const showDivisionAutoLabel =
    userRole === UserRole.DIVISION_ADMIN &&
    targetScope === CaseTargetScope.DIVISION &&
    !!profile?.divisionId &&
    profile.divisionId !== 'NONE';

  const showDeptSelector =
    (targetScope === CaseTargetScope.DEPARTMENT ||
      targetScope === CaseTargetScope.TEAM ||
      targetScope === CaseTargetScope.USER) &&
    userRole !== UserRole.DEPT_ADMIN &&
    userRole !== UserRole.TEAM_ADMIN;

  const showDeptAutoLabel =
    userRole === UserRole.DEPT_ADMIN &&
    targetScope === CaseTargetScope.DEPARTMENT &&
    !!profile?.departmentId &&
    profile.departmentId !== 'NONE';

  const showTeamSelector =
    (targetScope === CaseTargetScope.TEAM || targetScope === CaseTargetScope.USER) &&
    userRole !== UserRole.TEAM_ADMIN;

  const showTeamAutoLabel =
    userRole === UserRole.TEAM_ADMIN &&
    targetScope === CaseTargetScope.TEAM &&
    !!profile?.teamId &&
    profile.teamId !== 'NONE';

  const showUserSelector = targetScope === CaseTargetScope.USER && !isOrgUser;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = () => {
    reset({ title: '', dueDate: '', caseType: CaseType.REQUEST });
    setSubmitError(null);
    setSucceeded(false);
    setRichDesc({ description: '', descriptionFormat: 'tiptap_json', descriptionText: '' });
    setDescriptionError(null);
    setEditorKey((k) => k + 1);
    setDeliveryType(CaseDeliveryType.DIRECT);
    setTargetScope(getDefaultScope(userRole));
    setRequiredRole(UserRole.USER);
    setFilterDivisionId('');
    setFilterDepartmentId('');
    setFilterTeamId('');
    setSelectedUserId('');
    onClose();
  };

  const applyTemplate = useCallback((ct: CaseType) => {
    const titleMap: Record<CaseType, string> = {
      [CaseType.REQUEST]: t('template title REQUEST'),
      [CaseType.STANDARD]: t('template title STANDARD'),
      [CaseType.PROJECT]: t('template title PROJECT'),
    };
    const jsonMap: Record<CaseType, string> = {
      [CaseType.REQUEST]: REQUEST_TEMPLATE_JSON,
      [CaseType.STANDARD]: STANDARD_TEMPLATE_JSON,
      [CaseType.PROJECT]: PROJECT_TEMPLATE_JSON,
    };
    setValue('caseType', ct);
    setValue('title', titleMap[ct]);
    const desc = jsonMap[ct];
    setRichDesc({ description: desc, descriptionFormat: 'tiptap_json', descriptionText: TEMPLATE_TEXT[ct] });
    setDescriptionError(null);
    setEditorKey((k) => k + 1);
  }, [t, setValue]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    setDescriptionError(null);

    if (!richDesc.descriptionText.trim()) {
      setDescriptionError(t('Please enter a description.'));
      return;
    }

    const { scope: submitScope, scopeId: submitScopeId } = effectiveSubmitScope;

    if (!submitScopeId) {
      setSubmitError(getScopeRequiredError(targetScope));
      return;
    }

    const input: CreateRootCaseInput = {
      title: data.title.trim(),
      description: richDesc.description,
      descriptionFormat: richDesc.descriptionFormat,
      descriptionText: richDesc.descriptionText,
      caseType: data.caseType,
      deliveryType,
      targetScope: submitScope,
      targetScopeId: submitScopeId,
      requiredRole: effectiveRequiredRole,
      dueDate: data.dueDate || null,
    };

    try {
      await CaseService.createCase(input);
      setSucceeded(true);
      onSuccess();
    } catch (error) {
      console.error('Failed to create case', error);
      setSubmitError('Failed to create case. Please try again.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200"
          >
            {/* Accent strip */}
            <div className="h-0.5 bg-indigo-600" />
            {/* ── Header ── */}
            <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedCaseType === CaseType.PROJECT
                    ? t('Create Project')
                    : selectedCaseType === CaseType.STANDARD
                      ? t('Create Standard Case')
                      : t('Create Request')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCaseType === CaseType.PROJECT
                    ? t('case type desc PROJECT')
                    : selectedCaseType === CaseType.STANDARD
                      ? t('case type desc STANDARD')
                      : t('case type desc REQUEST')}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={16} />
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
                  <p className="text-base font-bold text-slate-900">{t('Case created successfully')}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('Added to the dashboard list.')}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {t('Close')}
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-4 md:p-6 space-y-5 max-h-[82vh] overflow-y-auto"
              >
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle size={13} className="shrink-0" />
                    {t(submitError)}
                  </div>
                )}

                {/* ── Case type ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('Case Type')}</label>
                  <div className="bg-slate-100 p-1 rounded-md flex gap-1 border border-slate-200">
                    {([CaseType.REQUEST, CaseType.STANDARD, CaseType.PROJECT] as CaseType[]).map((ct) => (
                      <label
                        key={ct}
                        className={`flex-1 flex items-center justify-center py-2 rounded-sm cursor-pointer transition-colors text-xs font-semibold select-none ${
                          selectedCaseType === ct
                            ? ct === CaseType.PROJECT
                              ? 'bg-violet-700 text-white'
                              : ct === CaseType.STANDARD
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-600 text-white'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('caseType')}
                          value={ct}
                          className="sr-only"
                        />
                        {t(CASE_TYPE_LABELS[ct])}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Quick templates ── */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('Quick templates:')}</span>
                  {([CaseType.REQUEST, CaseType.STANDARD, CaseType.PROJECT] as CaseType[]).map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => applyTemplate(ct)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        ct === CaseType.PROJECT
                          ? 'border-violet-200 text-violet-600 hover:bg-violet-50'
                          : ct === CaseType.STANDARD
                          ? 'border-blue-200 text-blue-600 hover:bg-blue-50'
                          : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {t(CASE_TYPE_LABELS[ct])}
                    </button>
                  ))}
                </div>

                {/* ── Title ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('Title')}</label>
                  <input
                    {...register('title', {
                      required: t('Please enter a title.'),
                      validate: (v) => v.trim().length > 0 || t('Please enter a title.'),
                    })}
                    placeholder={t('Enter case title')}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors bg-white placeholder:text-slate-400"
                  />
                  {errors.title && (
                    <p className="text-xs text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* ── Description ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('Content')}</label>
                  <RichEditor
                    key={editorKey}
                    description={richDesc.description}
                    descriptionFormat={richDesc.descriptionFormat}
                    onChange={(output) => { setRichDesc(output); setDescriptionError(null); }}
                  />
                  {descriptionError && (
                    <p className="text-xs text-red-600">{descriptionError}</p>
                  )}
                </div>

                {/* ── Delivery type ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('Delivery Type')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([CaseDeliveryType.DIRECT, CaseDeliveryType.OPEN] as CaseDeliveryType[]).map((dt) => {
                      const isSelected = deliveryType === dt;
                      const isDirect = dt === CaseDeliveryType.DIRECT;
                      const isDisabled = targetScope === CaseTargetScope.USER;
                      return (
                        <label
                          key={dt}
                          className={`flex flex-col px-3 py-2.5 rounded-md border-2 transition-colors select-none ${
                            isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            isSelected
                              ? isDirect
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white hover:border-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => { if (!isDisabled) setDeliveryType(dt); }}
                            disabled={isDisabled}
                          />
                          <span className="text-sm font-semibold">{t(CASE_DELIVERY_TYPE_LABELS[dt])}</span>
                          <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                            {isDirect ? t('Directly to a specific target') : t('Open within permission scope')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {targetScope === CaseTargetScope.USER && (
                    <p className="text-xs text-amber-700">
                      {t('Cases targeting a user are fixed to Direct.')}
                    </p>
                  )}
                </div>

                {/* ── Target scope buttons ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('Target Scope')}</label>
                  {allowedScopes.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {allowedScopes.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => setTargetScope(scope)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                            targetScope === scope
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t(SCOPE_LABELS[scope])}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                      {t(SCOPE_LABELS[allowedScopes[0] ?? CaseTargetScope.USER])} {t('(fixed)')}
                    </p>
                  )}
                </div>

                {/* ── Org loading / error ── */}
                {needsOrgData && !isOrgUser && (
                  <>
                    {orgLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 py-2 px-1">
                        <Loader2 size={14} className="animate-spin" />
                        {t('Loading org info...')}
                      </div>
                    )}
                    {orgError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={13} className="shrink-0 mt-0.5" />
                          <span>{t(orgError)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={fetchOrgData}
                          className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 underline shrink-0 whitespace-nowrap"
                        >
                          <RefreshCw size={11} />
                          {t('Retry')}
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
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        {t('Target (auto): ')} <span className="font-bold">{profile?.companyName ?? t('own company')}</span>
                      </div>
                    )}

                    {/* DIVISION auto label (DIVISION_ADMIN own scope) */}
                    {showDivisionAutoLabel && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        {t('Target (auto): ')} <span className="font-bold">{profile?.divisionName ?? profile?.divisionId}</span> {t('(division)')}
                      </div>
                    )}

                    {/* Division selector — only COMPANY_ADMIN */}
                    {showDivisionSelector && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {targetScope === CaseTargetScope.DIVISION && deliveryType === CaseDeliveryType.DIRECT
                            ? t('Target division *')
                            : targetScope === CaseTargetScope.DIVISION
                            ? t('Division scope (optional)')
                            : t('Division (filter, optional)')}
                        </label>
                        <select
                          value={filterDivisionId}
                          onChange={(e) => setFilterDivisionId(e.target.value)}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.DIVISION && deliveryType === CaseDeliveryType.DIRECT
                              ? t('-- Select division --')
                              : targetScope === CaseTargetScope.DIVISION
                              ? t('-- Company-wide (no filter) --')
                              : t('-- All divisions --')}
                          </option>
                          {filteredDivisions.map((d) => (
                            <option key={d.divisionId} value={d.divisionId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {filteredDivisions.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-slate-500">{t('No division data.')}</p>
                        )}
                      </div>
                    )}

                    {/* DEPARTMENT auto label (DEPT_ADMIN own scope) */}
                    {showDeptAutoLabel && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        {t('Target (auto): ')} <span className="font-bold">{profile?.departmentName ?? profile?.departmentId}</span> {t('(department)')}
                      </div>
                    )}

                    {/* Department selector */}
                    {showDeptSelector && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {targetScope === CaseTargetScope.DEPARTMENT && deliveryType === CaseDeliveryType.DIRECT
                            ? t('Target department *')
                            : targetScope === CaseTargetScope.DEPARTMENT
                            ? t('Department scope (optional)')
                            : t('Department (filter, optional)')}
                        </label>
                        <select
                          value={filterDepartmentId}
                          onChange={(e) => setFilterDepartmentId(e.target.value)}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.DEPARTMENT && deliveryType === CaseDeliveryType.DIRECT
                              ? t('-- Select department --')
                              : targetScope === CaseTargetScope.DEPARTMENT
                              ? t('-- Company-wide (no filter) --')
                              : t('-- All departments --')}
                          </option>
                          {filteredDepartments.map((d) => (
                            <option key={d.departmentId} value={d.departmentId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        {filteredDepartments.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-slate-500">
                            {filterDivisionId ? t('No dept data for selected division.') : t('No department data.')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* TEAM auto label (TEAM_ADMIN own scope) */}
                    {showTeamAutoLabel && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        {t('Target (auto): ')} <span className="font-bold">{profile?.teamName ?? profile?.teamId}</span> {t('(team)')}
                      </div>
                    )}

                    {/* Team selector */}
                    {showTeamSelector && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {targetScope === CaseTargetScope.TEAM && deliveryType === CaseDeliveryType.DIRECT
                            ? t('Target team *')
                            : targetScope === CaseTargetScope.TEAM
                            ? t('Team scope (optional)')
                            : t('Team (filter, optional)')}
                        </label>
                        <select
                          value={filterTeamId}
                          onChange={(e) => setFilterTeamId(e.target.value)}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        >
                          <option value="">
                            {targetScope === CaseTargetScope.TEAM && deliveryType === CaseDeliveryType.DIRECT
                              ? t('-- Select team --')
                              : targetScope === CaseTargetScope.TEAM
                              ? t('-- Company-wide (no filter) --')
                              : t('-- All teams --')}
                          </option>
                          {filteredTeams.map((tm) => (
                            <option key={tm.teamId} value={tm.teamId}>
                              {tm.name}
                            </option>
                          ))}
                        </select>
                        {filteredTeams.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-slate-500">
                            {filterDepartmentId ? t('No team data for selected department.') : t('No team data.')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* USER auto label (USER/GUEST) */}
                    {targetScope === CaseTargetScope.USER && isOrgUser && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700">
                        {t('Target (auto): ')} <span className="font-bold">{profile?.name ?? t('self')} {t('(self only)')}</span>
                      </div>
                    )}

                    {/* User selector (admins) */}
                    {showUserSelector && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {t('Target user *')}
                        </label>
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                        >
                          <option value="">{t('-- Select user --')}</option>
                          {filteredUsers.map((u) => (
                            <option key={u.userId} value={u.userId}>
                              {u.name}（{u.email}）
                            </option>
                          ))}
                        </select>
                        {filteredUsers.length === 0 && !orgLoading && (
                          <p className="text-[10px] text-slate-500">
                            {filterTeamId
                              ? t('No users in selected team.')
                              : filterDepartmentId
                                ? t('No users in selected department.')
                                : t('No user data.')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Required role (only when scope is not USER) ── */}
                {targetScope !== CaseTargetScope.USER && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      {t('Required permission')}
                      {deliveryType === CaseDeliveryType.OPEN && (
                        <span className="ml-1 text-amber-500 font-normal normal-case">{t('(important for open cases)')}</span>
                      )}
                    </label>
                    <select
                      value={requiredRole}
                      onChange={(e) => setRequiredRole(e.target.value as UserRole)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                    >
                      {allowedRequiredRoles.map((r) => (
                        <option key={r} value={r}>
                          {t(USER_ROLE_LABELS[r])}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      {t('Users with this role or higher can view.')}
                    </p>
                  </div>
                )}

                {/* ── Due date ── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" /> {t('Due Date (optional)')}
                  </label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all shadow-sm bg-white"
                  />
                </div>

                {/* ── Send summary confirmation ── */}
                {targetSummaryText && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <span className="text-xs font-semibold text-slate-600 block">{t('Target confirmation')}</span>
                    <div className="text-sm font-semibold text-slate-900">{targetSummaryText}</div>
                    <div className="text-xs text-slate-500 space-x-3">
                      <span>
                        {t('Delivery: ')} <span className="font-medium text-slate-700">{t(CASE_DELIVERY_TYPE_LABELS[deliveryType])}</span>
                      </span>
                      {targetScope !== CaseTargetScope.USER && (
                        <span>
                          {t('Required role: ')} <span className="font-medium text-slate-700">{t(USER_ROLE_LABELS[effectiveRequiredRole])} {t('or higher')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? t('Sending...') : t('Create Case')}
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

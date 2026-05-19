import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, Lock, Users, Building, Globe, Shield } from 'lucide-react';
import { TaskLevel, CreateTaskInput, AccessScope, UserProfile, UserRole, OrgService, Division, Department, Team } from '@task/core';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmitTask: (task: CreateTaskInput) => Promise<void>;
  memberId: string;
  profile?: UserProfile | null;
}

interface FormValues {
  title: string;
  content: string;
  level: TaskLevel;
  limitDate: string;
  accessScope: AccessScope;
}

const allScopeOptions = [
  { value: AccessScope.PRIVATE, label: '自分のみ', icon: Lock, minRole: UserRole.USER },
  { value: AccessScope.TEAM, label: 'チーム', icon: Users, minRole: UserRole.TEAM_ADMIN },
  { value: AccessScope.DEPARTMENT, label: '部署', icon: Building, minRole: UserRole.DEPT_ADMIN },
  { value: AccessScope.DIVISION, label: '本部', icon: Shield, minRole: UserRole.DIVISION_ADMIN },
  { value: AccessScope.COMPANY, label: '全社', icon: Globe, minRole: UserRole.COMPANY_ADMIN },
];

const roleLevel: Record<string, number> = {
  [UserRole.USER]: 0,
  [UserRole.TEAM_ADMIN]: 1,
  [UserRole.DEPT_ADMIN]: 2,
  [UserRole.DIVISION_ADMIN]: 3,
  [UserRole.COMPANY_ADMIN]: 4,
};

// 新規タスク作成モーダル
export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen, onClose, onSuccess, onSubmitTask, memberId, profile
}) => {
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      level: TaskLevel.MEDIUM,
      limitDate: 'NONE',
      accessScope: AccessScope.PRIVATE,
    }
  });

  const selectedScope = watch('accessScope');

  // 自分のroleに応じて使用可能なスコープのみ表示
  const userRoleLevel = roleLevel[profile?.role || UserRole.USER] ?? 0;
  const scopeOptions = allScopeOptions.filter(
    (opt) => (roleLevel[opt.minRole] ?? 0) <= userRoleLevel
  );

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [targetDivisionId, setTargetDivisionId] = useState('');
  const [targetDepartmentId, setTargetDepartmentId] = useState('');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // モーダルが開いたときに組織データを取得
  useEffect(() => {
    if (!isOpen) return;
    const fetchOrgData = async () => {
      try {
        const [divs, depts, ts] = await Promise.all([
          OrgService.getDivisions(),
          OrgService.getDepartments(),
          OrgService.getTeams(),
        ]);
        setDivisions(divs);
        setDepartments(depts);
        setTeams(ts);
      } catch (e) {
        console.error('Failed to fetch org data', e);
      }
    };
    fetchOrgData();
  }, [isOpen]);

  // スコープ変更時に対象とエラーをリセット
  useEffect(() => {
    setTargetDivisionId('');
    setTargetDepartmentId('');
    setTargetTeamId('');
    setSubmitError(null);
  }, [selectedScope]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);

    if (data.accessScope === AccessScope.TEAM && !targetTeamId) {
      setSubmitError('チームを選択してください。');
      return;
    }
    if (data.accessScope === AccessScope.DEPARTMENT && !targetDepartmentId) {
      setSubmitError('部署を選択してください。');
      return;
    }
    if (data.accessScope === AccessScope.DIVISION && !targetDivisionId) {
      setSubmitError('本部を選択してください。');
      return;
    }

    try {
      let taskDivisionId = profile?.divisionId || 'NONE';
      let taskDepartmentId = profile?.departmentId || 'NONE';
      let taskTeamId = profile?.teamId || 'NONE';

      if (data.accessScope === AccessScope.DIVISION && targetDivisionId) {
        taskDivisionId = targetDivisionId;
      } else if (data.accessScope === AccessScope.DEPARTMENT && targetDepartmentId) {
        const dept = departments.find(d => d.departmentId === targetDepartmentId);
        taskDivisionId = dept?.divisionId || 'NONE';
        taskDepartmentId = targetDepartmentId;
      } else if (data.accessScope === AccessScope.TEAM && targetTeamId) {
        const team = teams.find(t => t.teamId === targetTeamId);
        const dept = departments.find(d => d.departmentId === team?.departmentId);
        taskDivisionId = dept?.divisionId || 'NONE';
        taskDepartmentId = team?.departmentId || 'NONE';
        taskTeamId = targetTeamId;
      }

      const input: CreateTaskInput = {
        memberId,
        accessScope: data.accessScope,
        title: data.title,
        content: data.content,
        level: data.level,
        limitDate: data.limitDate || 'NONE',
        divisionId: taskDivisionId,
        departmentId: taskDepartmentId,
        teamId: taskTeamId,
      };

      await onSubmitTask(input);
      reset();
      setTargetDivisionId('');
      setTargetDepartmentId('');
      setTargetTeamId('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to create task", error);
      setSubmitError('タスクの作成に失敗しました。再度お試しください。');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">新規タスク作成</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  {submitError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">タイトル</label>
                <input
                  {...register('title', { required: true })}
                  placeholder="タスクのタイトルを入力"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-1 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 uppercase">内容</label>
                <textarea
                  {...register('content')}
                  placeholder="詳細内容を入力..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-1 outline-none transition-all h-24 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">公開範囲</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {scopeOptions.map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border cursor-pointer transition-all text-center ${
                        selectedScope === value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <input type="radio" {...register('accessScope')} value={value} className="sr-only" />
                      <Icon size={14} />
                      <span className="text-[10px] font-bold">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedScope === AccessScope.DIVISION && (
                <div className="space-y-1 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <label className="text-xs font-bold text-indigo-700 uppercase">対象本部</label>
                  <select
                    value={targetDivisionId}
                    onChange={(e) => setTargetDivisionId(e.target.value)}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-indigo-500"
                  >
                    <option value="">本部を選択してください</option>
                    {divisions.map(d => (
                      <option key={d.divisionId} value={d.divisionId}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedScope === AccessScope.DEPARTMENT && (
                <div className="space-y-1 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <label className="text-xs font-bold text-blue-700 uppercase">対象部署</label>
                  <select
                    value={targetDepartmentId}
                    onChange={(e) => setTargetDepartmentId(e.target.value)}
                    className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                  >
                    <option value="">部署を選択してください</option>
                    {departments.map(d => (
                      <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedScope === AccessScope.TEAM && (
                <div className="space-y-1 p-3 bg-green-50 rounded-xl border border-green-100">
                  <label className="text-xs font-bold text-green-700 uppercase">対象チーム</label>
                  <select
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                    className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-green-500"
                  >
                    <option value="">チームを選択してください</option>
                    {teams.map(t => (
                      <option key={t.teamId} value={t.teamId}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    <Flag size={12} /> 優先度
                  </label>
                  <select
                    {...register('level')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 outline-none bg-white"
                  >
                    <option value={TaskLevel.LOW}>低</option>
                    <option value={TaskLevel.MEDIUM}>中</option>
                    <option value={TaskLevel.HIGH}>高</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    <Calendar size={12} /> 完了予定日
                  </label>
                  <input
                    type="date"
                    {...register('limitDate')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "処理中..." : "作成する"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

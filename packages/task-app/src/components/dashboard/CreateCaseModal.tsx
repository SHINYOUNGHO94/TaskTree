"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle } from 'lucide-react';
import {
  CaseDeliveryType,
  CaseService,
  CaseTargetScope,
  CaseType,
  CreateRootCaseInput,
  UserProfile,
  UserRole,
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
  targetScope: CaseTargetScope;
}

const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.GUEST]: 1,
  [UserRole.USER]: 2,
  [UserRole.TEAM_ADMIN]: 3,
  [UserRole.DEPT_ADMIN]: 4,
  [UserRole.DIVISION_ADMIN]: 5,
  [UserRole.COMPANY_ADMIN]: 6,
};

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  profile,
  userId,
}) => {
  const userRole = profile?.role ?? UserRole.USER;
  const teamAvailable =
    ROLE_RANK[userRole] >= ROLE_RANK[UserRole.TEAM_ADMIN] &&
    !!profile?.teamId &&
    profile.teamId !== 'NONE';
  const defaultScope = teamAvailable ? CaseTargetScope.TEAM : CaseTargetScope.USER;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { targetScope: defaultScope, title: '', description: '', dueDate: '' },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const selectedScope = watch('targetScope');

  useEffect(() => {
    if (isOpen) {
      setValue('targetScope', defaultScope);
    }
  }, [defaultScope, isOpen, setValue]);

  const handleClose = () => {
    reset({ targetScope: defaultScope, title: '', description: '', dueDate: '' });
    setSubmitError(null);
    setSucceeded(false);
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);

    const targetScopeId =
      data.targetScope === CaseTargetScope.TEAM ? (profile?.teamId ?? '') : userId;

    if (!targetScopeId) {
      setSubmitError('送信先が設定されていません。');
      return;
    }

    const input: CreateRootCaseInput = {
      title: data.title.trim(),
      description: data.description.trim(),
      caseType: CaseType.REQUEST,
      deliveryType: CaseDeliveryType.DIRECT,
      targetScope: data.targetScope,
      targetScopeId,
      requiredRole: UserRole.USER,
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
              <div>
                <h2 className="text-lg font-bold text-gray-900">REQUEST 案件作成</h2>
                <p className="text-xs text-gray-400 mt-0.5">チームまたは自分への直接依頼</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {succeeded ? (
              <div className="p-8 flex flex-col items-center gap-4">
                <CheckCircle size={48} className="text-green-500" />
                <p className="text-lg font-bold text-gray-900">案件を作成しました</p>
                <button
                  onClick={handleClose}
                  className="mt-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
              >
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    {submitError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">タイトル</label>
                  <input
                    {...register('title', {
                      required: 'タイトルを入力してください。',
                      validate: (value) =>
                        value.trim().length > 0 || 'タイトルを入力してください。',
                    })}
                    placeholder="案件のタイトルを入力"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-1 outline-none transition-all"
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">内容</label>
                  <textarea
                    {...register('description', {
                      required: '内容を入力してください。',
                      validate: (value) =>
                        value.trim().length > 0 || '内容を入力してください。',
                    })}
                    placeholder="案件の詳細を入力..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 focus:ring-1 outline-none transition-all h-24 resize-none"
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase">送信先</label>
                  <div className="flex gap-2">
                    {teamAvailable && (
                      <label
                        className={`flex-1 flex items-center justify-center p-2.5 rounded-xl border cursor-pointer transition-all text-sm font-bold ${
                          selectedScope === CaseTargetScope.TEAM
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          {...register('targetScope')}
                          value={CaseTargetScope.TEAM}
                          className="sr-only"
                        />
                        自チーム{profile?.teamName ? ` (${profile.teamName})` : ''}
                      </label>
                    )}
                    <label
                      className={`flex-1 flex items-center justify-center p-2.5 rounded-xl border cursor-pointer transition-all text-sm font-bold ${
                        selectedScope === CaseTargetScope.USER
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('targetScope')}
                        value={CaseTargetScope.USER}
                        className="sr-only"
                      />
                      自分のみ
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1">
                    <Calendar size={12} /> 期限（任意）
                  </label>
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-gray-900 outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
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

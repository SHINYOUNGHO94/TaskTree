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
    defaultValues: { targetScope: defaultScope, title: '', description: '', dueDate: '', caseType: CaseType.REQUEST },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const selectedScope = watch('targetScope');
  const selectedCaseType = watch('caseType');

  useEffect(() => {
    if (isOpen) {
      setValue('targetScope', defaultScope);
    }
  }, [defaultScope, isOpen, setValue]);

  const handleClose = () => {
    reset({ targetScope: defaultScope, title: '', description: '', dueDate: '', caseType: CaseType.REQUEST });
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
      caseType: data.caseType,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100/80 bg-gray-50/50">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedCaseType === CaseType.PROJECT
                    ? "PROJECT 案件作成"
                    : selectedCaseType === CaseType.STANDARD
                      ? "STANDARD 案件作成"
                      : "REQUEST 案件作成"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {selectedCaseType === CaseType.PROJECT
                    ? "複数の STANDARD に分解できる大型案件"
                    : selectedCaseType === CaseType.STANDARD
                      ? "複数の REQUEST に分解できる社内案件"
                      : "チームまたは自分への直接依頼"}
                </p>
              </div>
              <button 
                onClick={handleClose} 
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

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
                  <p className="text-xs text-gray-400 mt-1">ダッシュボードの一覧に新しく追加されました。</p>
                </div>
                <button
                  onClick={handleClose}
                  className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm hover:shadow"
                >
                  閉じる
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
              >
                {submitError && (
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                    {submitError}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">案件タイプ</label>
                  <div className="bg-gray-100 p-1 rounded-xl flex gap-1 border border-gray-200/20">
                    <label
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                        selectedCaseType === CaseType.REQUEST
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                          : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('caseType')}
                        value={CaseType.REQUEST}
                        className="sr-only"
                      />
                      REQUEST
                    </label>
                    <label
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                        selectedCaseType === CaseType.STANDARD
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                          : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('caseType')}
                        value={CaseType.STANDARD}
                        className="sr-only"
                      />
                      STANDARD
                    </label>
                    <label
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                        selectedCaseType === CaseType.PROJECT
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        {...register('caseType')}
                        value={CaseType.PROJECT}
                        className="sr-only"
                      />
                      PROJECT
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">タイトル</label>
                  <input
                    {...register('title', {
                      required: 'タイトルを入力してください。',
                      validate: (value) =>
                        value.trim().length > 0 || 'タイトルを入力してください。',
                    })}
                    placeholder="案件のタイトルを入力"
                    className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all shadow-sm bg-white"
                  />
                  {errors.title && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">内容</label>
                  <textarea
                    {...register('description', {
                      required: '内容を入力してください。',
                      validate: (value) =>
                        value.trim().length > 0 || '内容を入力してください。',
                    })}
                    placeholder="案件の詳細を入力..."
                    className="w-full border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 outline-none transition-all h-24 resize-none shadow-sm bg-white"
                  />
                  {errors.description && (
                    <p className="text-[11px] text-red-500 font-medium">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">送信先</label>
                  <div className="bg-gray-100 p-1 rounded-xl flex gap-1 border border-gray-200/20">
                    {teamAvailable && (
                      <label
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                          selectedScope === CaseTargetScope.TEAM
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                            : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
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
                      className={`flex-1 flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all text-xs font-bold select-none ${
                        selectedScope === CaseTargetScope.USER
                          ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                          : 'hover:text-gray-900 text-gray-500 hover:bg-gray-50/50'
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

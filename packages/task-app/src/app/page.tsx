"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { AuthService } from "@task/core";
import { useUser } from "../components/providers/UserProvider";

// 1. バリデーションスキーマ 
const loginSchema = z.object({
  email: z.email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, isLoading, refreshUser } = useUser();
  
  // 2. 認証チェック
  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    const result = await AuthService.signIn(data.email, data.password);
    
    if (result.success || result.error === "UserAlreadyAuthenticatedException") {
      await refreshUser(); // グローバル状態を更新してから遷移
      router.push("/dashboard");
    } else {
      setAuthError(result.error || "UNKNOWN_ERROR");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
      {isVerified && (
        <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>認証が完了しました。ログインしてください。</span>
        </div>
      )}

      {authError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{authError === "NotAuthorizedException" ? "認証に失敗しました。" : authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">メールアドレス</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              {...register("email")}
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">パスワード</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>

        <div className="pt-4 text-center border-t border-gray-100 flex flex-col gap-3">
          <Link href="/signup" className="text-sm text-blue-600 hover:underline font-medium">
            新規アカウント作成
          </Link>
          <button 
            type="button"
            onClick={async () => {
              await AuthService.signOut();
              window.location.reload();
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            セッション削除
          </button>
        </div>
      </form>
    </div>
  );
};

const LoginPage = () => {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Header (Simple Text Logo) */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            TaskTree
          </h1>
          <p className="text-gray-600 mt-2 text-sm">ログイン</p>
        </div>

        {/* Login Form Card */}
        <Suspense fallback={<div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm animate-pulse h-64" />}>
          <LoginContent />
        </Suspense>

        <div className="mt-8 text-center text-xs text-gray-400">
          TaskTree
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
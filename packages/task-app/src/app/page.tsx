"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthService } from "@task/core";

// 1. バリデーションスキーマ 
const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  
  // 2. 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      const user = await AuthService.getCurrentUser();
      if (user) {
        router.push("/dashboard");
      }
    };
    checkAuth();
  }, [router]);

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
      router.push("/dashboard");
    } else {
      setAuthError(result.error || "UNKNOWN_ERROR");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Header (Simple Text Logo) */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            TaskTree <span className="text-sm font-normal text-gray-500">v1.0</span>
          </h1>
          <p className="text-gray-600 mt-2 text-sm">ポートフォリオ用 業務管理システム</p>
        </div>

        {/* Login Form Card (Simple White Card) */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          {authError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{authError === "NotAuthorizedException" ? "認証に失敗しました。" : authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
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
              <label className="text-sm font-medium text-gray-700">Password</label>
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
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          © 2024 TaskTree Architecture Demo
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
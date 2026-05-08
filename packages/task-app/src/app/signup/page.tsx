"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, UserPlus, ArrowLeft, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { AuthService } from "@task/core";

// 1. バリデーションスキーマ
const signupSchema = z.object({
  familyName: z.string().min(1, { message: "姓を入力してください。" }),
  givenName: z.string().min(1, { message: "名を入力してください。" }),
  email: z.email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(8, { message: "パスワードは8文字以上で入力してください。" }),
  confirmPassword: z.string().min(1, { message: "確認用パスワードを入力してください。" }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setError(null);
    
    // パスワード一致チェック
    if (data.password !== data.confirmPassword) {
      setError("パスワードが一致しません。");
      return;
    }

    // フルネームを作成 (姓 + 名)
    const fullName = `${data.familyName} ${data.givenName}`;
    const result = await AuthService.signUp(data.email, data.password, fullName);
    
    if (result.success) {
      // 登録成功 -> 認証画面へ
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    } else {
      // エラーハンドリング
      let message = "登録に失敗しました。";
      if (result.error === "UsernameExistsException") {
        message = "このメールアドレスは既に登録されています。";
      } else if (result.error === "InvalidParameterException") {
        message = "入力内容が正しくありません。パスワードの規則などを確認してください。";
      }
      setError(message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            TaskTree
          </h1>
          <p className="text-gray-600 mt-2 text-sm">新規登録</p>
        </div>

        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
            <ArrowLeft size={16} />
            <span>ログイン</span>
          </Link>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">姓</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    {...register("familyName")}
                    placeholder="辛"
                    className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                {errors.familyName && <p className="text-xs text-red-500 mt-1">{errors.familyName.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">名</label>
                <input 
                  {...register("givenName")}
                  placeholder="永呼"
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                {errors.givenName && <p className="text-xs text-red-500 mt-1">{errors.givenName.message}</p>}
              </div>
            </div>

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
                  placeholder="8文字以上"
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">パスワード（確認）</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password"
                  {...register("confirmPassword")}
                  placeholder="再度入力"
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <UserPlus size={18} />
              {isSubmitting ? "処理中..." : "新規登録"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          TaskTree
        </div>
      </div>
    </main>
  );
};

export default SignupPage;

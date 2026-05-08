"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { AuthService } from "@task/core";

// バリデーションスキーマ
const verifySchema = z.object({
  code: z.string().length(6, { message: "6桁の認証コードを入力してください。" }),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

const VerifyContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormValues) => {
    setError(null);
    const result = await AuthService.confirmSignUp(email, data.code);
    
    if (result.success) {
      // 認証成功 -> ログインページへ（あるいはそのままサインイン）
      router.push("/?verified=true");
    } else {
      setError("認証コードが正しくないか、期限が切れています。");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
      <Link 
        href="/signup" 
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>戻る</span>
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">認証コード入力</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">{email}</span> に送信されたコードを入力してください。
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <input 
            {...register("code")}
            placeholder="000000"
            maxLength={6}
            className="w-full border border-gray-300 rounded-md py-3 px-4 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
          {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || !email}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ShieldCheck size={18} />
          {isSubmitting ? "確認中..." : "認証"}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    </div>
  );
};

const VerifyPage = () => {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            TaskTree
          </h1>
        </div>

        <Suspense fallback={<div className="text-center py-10">読み込み中...</div>}>
          <VerifyContent />
        </Suspense>

        <div className="mt-8 text-center text-xs text-gray-400">
          TaskTree
        </div>
      </div>
    </main>
  );
};

export default VerifyPage;

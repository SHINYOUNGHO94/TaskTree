"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { GlassCard, NeonButton, ModernInput } from "@task/ui";
import { AuthService } from "@task/core";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください。" }),
  password: z.string().min(6, { message: "パスワードは6文字以上で入力してください。" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  
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
    
    if (result.success) {
      router.push("/dashboard");
    } else {
      setAuthError(result.error || "UNKNOWN_ERROR");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-charcoal">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-5xl font-heading font-bold text-white tracking-tighter">
            TaskTree
          </h1>
          <p className="text-white/40 mt-3 text-sm font-body tracking-wide">
            ポートフォリオ用の案件管理システム
          </p>
        </div>

        <GlassCard className="p-10">
          {authError && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-body"
            >
              <AlertCircle size={18} />
              <span>{authError === "NotAuthorizedException" ? "メールアドレスまたはパスワードが正しくありません。" : authError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <ModernInput
              label="Email"
              placeholder="name@company.com"
              icon={<Mail size={18} />}
              error={errors.email?.message}
              {...register("email")}
            />
            <ModernInput
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="pt-4">
              <NeonButton 
                type="submit" 
                className="w-full text-lg py-4" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </NeonButton>
            </div>
          </form>

          <div className="mt-10 flex justify-center">
            <button className="text-white/30 hover:text-white/60 text-xs transition-colors font-body">
              Forgot your password?
            </button>
          </div>
        </GlassCard>

        <div className="mt-12 text-center text-[10px] text-white/10 uppercase tracking-[0.2em] font-body">
          © 2024 TaskTree. Premium Productivity.
        </div>
      </motion.div>
    </main>
  );
};

export default LoginPage;
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AuthService } from "@task/core";
import { useUser } from "../components/providers/UserProvider";
import { changeUILanguage, getStoredLang, SupportedLang } from "../locales";

const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";
  const [authError, setAuthError] = useState<string | null>(null);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const { user, isLoading, refreshUser } = useUser();
  const { t } = useTranslation("ui");

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
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null);
    const result = await AuthService.signIn(data.email, data.password);

    if (result.success || result.error === "UserAlreadyAuthenticatedException") {
      await refreshUser();
      router.push("/dashboard");
    } else if (result.error === "NEW_PASSWORD_REQUIRED") {
      setIsNewPasswordRequired(true);
    } else {
      setAuthError("Authentication failed.");
    }
  };

  const onConfirmNewPassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (newPassword.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }
    const result = await AuthService.confirmNewPassword(newPassword);
    if (result.success) {
      await refreshUser();
      router.push("/dashboard");
    } else {
      setAuthError("Failed to change password.");
    }
  };

  if (isNewPasswordRequired) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("Reset Password")}</h2>
          <p className="text-sm text-gray-600">
            {t("You logged in with an initial password. Please set a new password for security.")}
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{t(authError)}</span>
          </div>
        )}

        <form onSubmit={onConfirmNewPassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t("New Password")}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("8+ characters")}
                className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newPassword}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {t("Set Password & Login")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
      {isVerified && (
        <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{t("Email verified. Please log in.")}</span>
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t("Demo Account")}</p>
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-20 text-xs">Email</span>
            <code className="font-mono text-gray-900">test@tasktree.dev</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-20 text-xs">{t("Password")}</span>
            <code className="font-mono text-gray-900">TaskTree123@</code>
          </div>
        </div>
      </div>

      {authError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{t(authError)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{t("Email Address")}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              {...register("email")}
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {errors.email && <p className="text-xs text-red-500 mt-1">{t(errors.email.message!)}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">{t("Password")}</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{t(errors.password.message!)}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? t("Logging in...") : t("Login")}
        </button>

        <div className="pt-4 text-center border-t border-gray-100 flex flex-col gap-3">
          <Link href="/signup" className="text-sm text-blue-600 hover:underline font-medium">
            {t("Create Account")}
          </Link>
          <button
            type="button"
            onClick={async () => {
              await AuthService.signOut();
              window.location.reload();
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t("Clear Session")}
          </button>
        </div>
      </form>
    </div>
  );
};

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日" },
  { code: "ko", label: "한" },
  { code: "zh", label: "中" },
];

const LoginPage = () => {
  const [lang, setLang] = useState<SupportedLang>(getStoredLang());
  const { t } = useTranslation("ui");

  const handleLangChange = (code: SupportedLang) => {
    changeUILanguage(code);
    setLang(code);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">TaskTree</h1>
          <p className="text-gray-600 mt-2 text-sm">{t("Login")}</p>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangChange(l.code)}
                className={`text-xs px-2 py-1 rounded font-bold transition-colors ${lang === l.code ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <Suspense fallback={<div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm animate-pulse h-64" />}>
          <LoginContent />
        </Suspense>

        <div className="mt-8 text-center text-xs text-gray-400">TaskTree</div>
      </div>
    </main>
  );
};

export default LoginPage;

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AuthService } from "@task/core";
import { changeUILanguage, getStoredLang, SupportedLang } from "../../locales";

const verifySchema = z.object({
  code: z.string().length(6, { message: "Enter a 6-digit verification code." }),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

const VerifyContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const companyName = searchParams.get("company") || "";
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("ui");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormValues) => {
    setError(null);
    const result = await AuthService.confirmSignUp(email, data.code, companyName);

    if (result.success) {
      router.push("/?verified=true");
    } else {
      setError("Invalid or expired verification code.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
      <Link
        href="/signup"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>{t("Back")}</span>
      </Link>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t("Enter Verification Code")}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          {t("Enter the code sent to {{email}}.", { email })}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{t(error)}</span>
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
          {errors.code && <p className="text-xs text-red-500 mt-1">{t(errors.code.message!)}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ShieldCheck size={18} />
          {isSubmitting ? t("Verifying...") : t("Verify")}
        </button>
      </form>

      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800 leading-relaxed">
        ⚠️ {t("Check spam if email not received.")}
      </div>
    </div>
  );
};

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日" },
  { code: "ko", label: "한" },
  { code: "zh", label: "中" },
];

const VerifyPage = () => {
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

        <Suspense fallback={<div className="text-center py-10">{t("Loading...")}</div>}>
          <VerifyContent />
        </Suspense>

        <div className="mt-8 text-center text-xs text-gray-400">© 2026 TaskTree</div>
      </div>
    </main>
  );
};

export default VerifyPage;

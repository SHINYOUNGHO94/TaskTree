"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertCircle, UserPlus, ArrowLeft, User, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AuthService } from "@task/core";
import { changeUILanguage, getStoredLang, SupportedLang } from "../../locales";

const signupSchema = z.object({
  companyName: z.string().min(1, { message: "Please enter the company name." }),
  familyName: z.string().min(1, { message: "Enter your last name." }),
  givenName: z.string().min(1, { message: "Enter your first name." }),
  email: z.email({ message: "Enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(1, { message: "Enter confirm password." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const LANGS: { code: SupportedLang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ja", label: "日" },
  { code: "ko", label: "한" },
  { code: "zh", label: "中" },
];

const SignupPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<SupportedLang>(getStoredLang());
  const { t } = useTranslation("ui");

  const handleLangChange = (code: SupportedLang) => {
    changeUILanguage(code);
    setLang(code);
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setError(null);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const fullName = `${data.familyName} ${data.givenName}`;
    const result = await AuthService.signUp(data.email, data.password, fullName, data.companyName);

    if (result.success) {
      router.push(`/verify?email=${encodeURIComponent(data.email)}&company=${encodeURIComponent(data.companyName)}`);
    } else {
      if (result.error === "UsernameExistsException") {
        setError("This email is already registered.");
      } else if (result.error === "InvalidParameterException") {
        setError("Invalid input. Check password requirements.");
      } else {
        setError("Registration failed.");
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center relative">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">TaskTree</h1>
          <p className="text-gray-600 mt-2 text-sm">{t("Sign Up")}</p>
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

        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
            <ArrowLeft size={16} />
            <span>{t("Back to Login")}</span>
          </Link>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{t(error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t("Company Name")}</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  {...register("companyName")}
                  placeholder="TaskTree Inc."
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.companyName && <p className="text-xs text-red-500 mt-1">{t(errors.companyName.message!)}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t("Last Name")}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    {...register("familyName")}
                    className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                {errors.familyName && <p className="text-xs text-red-500 mt-1">{t(errors.familyName.message!)}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t("First Name")}</label>
                <input
                  {...register("givenName")}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                {errors.givenName && <p className="text-xs text-red-500 mt-1">{t(errors.givenName.message!)}</p>}
              </div>
            </div>

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
                  placeholder={t("8+ characters")}
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{t(errors.password.message!)}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t("Confirm Password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  {...register("confirmPassword")}
                  placeholder={t("Re-enter password")}
                  className="w-full border border-gray-300 rounded-md py-2.5 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{t(errors.confirmPassword.message!)}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {isSubmitting ? t("Processing...") : t("Sign Up")}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">TaskTree</div>
      </div>
    </main>
  );
};

export default SignupPage;

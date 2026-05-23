"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AuthService } from "@task/core";
import { useUser } from "../../components/providers/UserProvider";
import { Sidebar } from "../../components/dashboard/Sidebar";
import { DashboardHeader } from "../../components/dashboard/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, profile, isLoading } = useUser();
  const { t } = useTranslation("ui");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  if (!user) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center animate-pulse" />
          <p className="text-xs text-slate-500 animate-pulse tracking-widest uppercase">{t("Loading...")}</p>
        </div>
      );
    }
    return null;
  }

  const displayName = profile?.name || user.name || user.email;
  const isProfileIncomplete = !!profile && profile.name === profile.email;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader userName={displayName} onSignOut={handleSignOut} />
        {isProfileIncomplete && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center gap-2 text-sm">
            <span className="text-amber-700">{t("Profile not configured.")}</span>
            <Link href="/dashboard/profile" className="text-amber-800 font-semibold underline">
              {t("Set up now →")}
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

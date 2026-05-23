"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const { user, isLoading } = useUser();

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
          <p className="text-xs text-slate-500 animate-pulse tracking-widest uppercase">読み込み中...</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader userName={user.name} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

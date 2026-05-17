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
        <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="text-xs font-bold text-gray-400 animate-pulse tracking-widest">読み込み中...</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader userName={user.name} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

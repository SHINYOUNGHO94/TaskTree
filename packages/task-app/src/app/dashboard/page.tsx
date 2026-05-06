"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { NeonButton } from "@task/ui";
import { AuthService, AuthUser } from "@task/core";

const DashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
    };
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await AuthService.signOut();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center text-white font-body">
        Loading...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-charcoal p-8 flex items-center justify-center">
      <div className="text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-heading font-bold text-white mb-8"
        >
          Dashboard
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <NeonButton 
            variant="outline" 
            onClick={handleSignOut}
            className="flex gap-2 mx-auto"
          >
            <LogOut size={18} />
            Sign Out
          </NeonButton>
        </motion.div>
      </div>
    </main>
  );
};

export default DashboardPage;

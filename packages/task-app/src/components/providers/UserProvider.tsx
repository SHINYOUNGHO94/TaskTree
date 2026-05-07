"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService, AuthUser, UserService, UserProfile } from "@task/core";

// Contextの型定義
interface UserContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

// Contextの作成
const UserContext = createContext<UserContextType | undefined>(undefined);

// ユーザー認証状態と組織プロファイルをアプリケーション全体で共有するプロバイダー
export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ユーザー情報および組織プロファイルの取得処理
  const fetchUser = async () => {
    setIsLoading(true);
    try {
      // 1. 認証情報の取得
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      // 2. 認証済みであれば組織プロファイルを取得
      if (currentUser) {
        try {
          const userProfile = await UserService.getUserProfile();
          setProfile(userProfile);
        } catch (profileError) {
          console.error("Failed to fetch user profile, but keeping auth session", profileError);
          setProfile(null);
        }
      } else {  
        setProfile(null);
      }
    } catch (error) {
      console.error("Auth session check failed", error);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, profile, isLoading, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

// ユーザー情報を利用するためのカスタムフック
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

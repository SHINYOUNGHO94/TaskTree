"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  const fetchLock = useRef(false);

  // ユーザー情報および組織プロファイルの取得処理
  const fetchUser = async () => {
    if (fetchLock.current) return;
    fetchLock.current = true;
    
    setIsLoading(true);
    try {
      // 1. 認証情報の取得
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      // 認証情報が確認できた時点で即座にisLoadingをfalseにし、レンダリングをブロックしない
      setIsLoading(false);

      // 2. 認証済みであれば組織プロファイルをバックグラウンドで取得
      if (currentUser) {
        try {
          const userProfile = await UserService.getUserProfile();
          setProfile(userProfile);
        } catch (profileError) {
          console.log("Profile not ready yet, retrying in 2 seconds...", profileError);
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const secondAttempt = await UserService.getUserProfile();
            setProfile(secondAttempt);
          } catch (secondError) {
            console.error("Final profile fetch attempt failed", secondError);
            setProfile(null);
          }
        }
      } else {  
        setProfile(null);
      }
    } catch (error) {
      console.error("Auth session check failed", error);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    } finally {
      fetchLock.current = false;
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

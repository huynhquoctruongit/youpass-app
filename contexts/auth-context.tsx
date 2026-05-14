import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authApi } from "@/services/api/auth";

interface UserProfile {
  id: string;
  email: string;
  fullname?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  external_avatar?: string;
  role?: { name: string };
}

interface AuthContextValue {
  profile: UserProfile | null;
  isLogin: boolean | null;
  isLoading: boolean;
  loginWithGoogle: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  getProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await authApi.getProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (accessToken: string) => {
    const data = await authApi.loginWithGoogle(accessToken);
    if (data?.access_token) {
      await SecureStore.setItemAsync("auth_token", data.access_token);
    }
    await fetchProfile();
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("auth_token");
    setProfile(null);
  };

  useEffect(() => {
    const init = async () => {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        await fetchProfile();
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLogin: isLoading ? null : profile ? true : false,
        isLoading,
        loginWithGoogle,
        logout,
        getProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}

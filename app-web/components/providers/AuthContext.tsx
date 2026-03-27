'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { canManageAssets, canManageUsers, canViewAuditLogs, getCurrentUser, getUserProfile, hasDashboardAccess } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  canAccessDashboard: boolean;
  canManageAssets: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuthData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await getUserProfile(currentUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAuthData();
  }, []);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const userProfile = await getUserProfile(user.id);
    setProfile(userProfile);
  };

  const isAdmin = profile?.role === 'admin';
  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAdmin,
    canAccessDashboard: hasDashboardAccess(profile),
    canManageAssets: canManageAssets(profile),
    canViewAuditLogs: canViewAuditLogs(profile),
    canManageUsers: canManageUsers(profile),
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

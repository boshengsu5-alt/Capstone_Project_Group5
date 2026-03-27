'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, getUserProfile } from '@/lib/auth';

interface UserProfile {
  id: string;
  full_name?: string;
  role: 'admin' | 'student' | string;
  avatar_url?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuthData = async () => {
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
    fetchAuthData();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  const value = {
    user,
    profile,
    isLoading,
    isAdmin: profile?.role === 'admin',
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

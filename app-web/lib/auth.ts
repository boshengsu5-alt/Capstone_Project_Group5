import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { supabase } from './supabase';

const DASHBOARD_ROLES: Profile['role'][] = ['admin', 'staff'];

/**
 * 1. 登录 (SignIn)
 * 接受邮箱和密码，返回 Supabase 的用户数据或错误信息
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const clearSessionCookie = () => {
  if (typeof document === 'undefined') return;

  document.cookie = 'unigear-session=; path=/; max-age=0; SameSite=Lax';
  // Backward-compatible cleanup for the old middleware cookie name.
  document.cookie = 'unigear-admin=; path=/; max-age=0; SameSite=Lax';
};

export const clearStoredAuthState = () => {
  clearSessionCookie();

  if (typeof window === 'undefined') return;

  const storages = [window.localStorage, window.sessionStorage];

  storages.forEach((storage) => {
    const keysToRemove: string[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  });
};

/**
 * 2. 登出 (SignOut)
 * 清除 Supabase session 并移除 middleware 用的 session cookie
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  clearStoredAuthState();
  return { error };
};

/**
 * Set the session cookie used by middleware for route guarding.
 * 设置 middleware 路由守卫用的 session cookie
 */
export const setSessionCookie = () => {
  // 有效期 7 天
  document.cookie = 'unigear-session=1; path=/; max-age=604800; SameSite=Lax';
};

/**
 * 3. 获取当前登录用户 (GetCurrentUser)
 * 这是一个异步函数，用于在各个组件里判断”我是谁”
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('getCurrentUser Error:', error.message);
      // 如果是 Refresh Token 错误，返回 null 触发重定向
      return null;
    }
    return user;
  } catch (err) {
    console.error('getCurrentUser Exception:', err);
    return null;
  }
};

/**
 * 5. 获取用户档案 (GetUserProfile)
 * 从 profiles 表获取完整的用户信息（含 role）
 */
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('getUserProfile error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getUserProfile exception:', err);
    return null;
  }
};

export const hasDashboardAccess = (profile: Pick<Profile, 'role'> | null | undefined) => {
  if (!profile) return false;
  return DASHBOARD_ROLES.includes(profile.role);
};

export const canManageAssets = hasDashboardAccess;
export const canViewAuditLogs = hasDashboardAccess;

export const canManageUsers = (profile: Pick<Profile, 'role'> | null | undefined) => {
  return profile?.role === 'admin';
};

export const checkDashboardAccess = async (userId: string) => {
  const profile = await getUserProfile(userId);
  return hasDashboardAccess(profile);
};

/**
 * 4. 检查管理员权限 (CheckAdminRole)
 * 基于 Day 2 的进阶要求：查询 profiles 表里的 role 字段是否为 'admin'
 */
export const checkAdminRole = async (userId: string) => {
  const profile = await getUserProfile(userId);
  return canManageUsers(profile);
};

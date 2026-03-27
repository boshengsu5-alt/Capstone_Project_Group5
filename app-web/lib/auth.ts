import { supabase } from './supabase';

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

/**
 * 2. 登出 (SignOut)
 * 清除 Supabase session 并移除 middleware 用的 admin cookie
 */
export const signOut = async () => {
  // 清除 middleware 路由守卫 cookie
  document.cookie = 'unigear-admin=; path=/; max-age=0';
  
  // 彻底清除 local storage 中的 supabase.auth.token 等
  if (typeof window !== 'undefined') {
    localStorage.clear(); 
    sessionStorage.clear();
  }

  const { error } = await supabase.auth.signOut();
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
export const getCurrentUser = async () => {
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
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

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

/**
 * 4. 检查管理员权限 (CheckAdminRole)
 * 基于 Day 2 的进阶要求：查询 profiles 表里的 role 字段是否为 'admin'
 */
export const checkAdminRole = async (userId: string) => {
  const profile = await getUserProfile(userId);
  return profile?.role === 'admin';
};

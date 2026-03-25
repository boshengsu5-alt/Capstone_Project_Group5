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
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * Set the admin session cookie used by middleware for route guarding.
 * 设置 middleware 路由守卫用的 admin cookie（登录成功且确认为 admin 后调用）
 */
export const setAdminCookie = () => {
  // 有效期 7 天，与 Supabase 默认 refresh 周期对齐
  document.cookie = 'unigear-admin=1; path=/; max-age=604800; SameSite=Lax';
};

/**
 * 3. 获取当前登录用户 (GetCurrentUser)
 * 这是一个异步函数，用于在各个组件里判断”我是谁”
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
};

/**
 * 4. 检查管理员权限 (CheckAdminRole)
 * 基于 Day 2 的进阶要求：查询 profiles 表里的 role 字段是否为 'admin'
 */
export const checkAdminRole = async (userId: string) => {
  try {
    // Supabase 泛型类型可能不完整，用 as any 绕过推断
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return data.role === 'admin';
  } catch (err) {
    return false;
  }
};

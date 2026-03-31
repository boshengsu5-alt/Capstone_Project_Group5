import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  CreditScoreLog,
  Profile,
  VerifyStudentIdentityResult,
} from '../../../database/types/supabase';

// 手写 Database 类型与客户端泛型在 update 场景下存在推断问题。
// 这里沿用项目里其它 service 的做法，使用 db 别名规避类型噪音。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ============================================================
// Auth Service — 认证服务
// ============================================================

/**
 * Register a new user with email, password, and full name.
 * 使用邮箱、密码和姓名注册新用户
 *
 * @param email - University email address. 学校邮箱
 * @param password - User password (min 6 chars). 用户密码（至少6位）
 * @param fullName - Display name. 显示名称
 * @returns Supabase auth data with user and session. 包含用户和会话的认证数据
 */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data;
}

export type VerifiedStudentIdentity = {
  department: string;
  enrollmentYear: number;
};

/**
 * Verify whether the student ID and full name match a roster record.
 * 验证学号和姓名是否匹配花名册记录。
 */
export async function verifyStudentIdentity(
  studentId: string,
  fullName: string
): Promise<VerifiedStudentIdentity> {
  const { data, error } = await db.rpc('verify_student_identity', {
    p_student_id: studentId.trim(),
    p_full_name: fullName.trim(),
  });

  if (error) throw error;

  const result = data as VerifyStudentIdentityResult | null;
  if (!result?.success) {
    throw new Error(result?.error || 'identity_verification_failed');
  }

  return {
    department: result.department || '',
    enrollmentYear: Number(result.enrollment_year || 0),
  };
}

/**
 * Register a student account after roster verification.
 * 学生身份验证通过后创建账号。
 */
export async function registerStudent(
  studentId: string,
  fullName: string,
  email: string,
  password: string,
  department: string,
  enrollmentYear: number
) {
  const trimmedStudentId = studentId.trim();
  const trimmedFullName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedDepartment = department.trim();

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        full_name: trimmedFullName,
        student_id: trimmedStudentId,
        department: trimmedDepartment,
        enrollment_year: enrollmentYear,
      },
    },
  });

  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('user_not_created');
  }

  const { error: profileError } = await db
    .from('profiles')
    .update({
      full_name: trimmedFullName,
      student_id: trimmedStudentId,
      department: trimmedDepartment,
    })
    .eq('id', userId);

  if (profileError && data.session) {
    throw profileError;
  }

  // 如果当前环境注册后立即拥有 session，则再补一次显式标记；
  // 若邮箱验证开启导致 session 为空，则由数据库 trigger 完成回填与绑定。
  if (data.session) {
    const { error: markError } = await db.rpc('mark_student_registered', {
      p_student_id: trimmedStudentId,
      p_user_id: userId,
    });

    if (markError) throw markError;
  }

  return data;
}

/**
 * Sign in with email and password.
 * 使用邮箱和密码登录
 *
 * @param email - University email address. 学校邮箱
 * @param password - User password. 用户密码
 * @returns Supabase session data. Supabase 会话数据
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/** Sign out the current user. 退出登录 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get current session, null if not logged in. 获取当前会话，未登录返回 null */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Get current authenticated user, throws if not logged in. 获取当前登录用户，未登录则抛出错误 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('用户未登录');
  return user;
}

/**
 * Listen to auth state changes (for RootNavigator real-time page switching).
 * 监听认证状态变化（用于 RootNavigator 实时切换页面）
 *
 * @param callback - Called with session on every auth change. 每次认证变化时调用
 * @returns Subscription object with unsubscribe method. 包含取消订阅方法的对象
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

/**
 * Get current user's profile from the profiles table.
 * 从 profiles 表获取当前用户的完整资料
 *
 * @returns User profile data. 用户资料数据
 */
export async function getMyProfile() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

type UpdateMyProfileInput = {
  full_name?: string;
  student_id?: string | null;
  department?: string;
  phone?: string;
  avatar_url?: string;
};

/**
 * Update current user's profile fields.
 * 更新当前用户的个人资料字段。
 */
export async function updateMyProfile(updates: UpdateMyProfileInput): Promise<Profile> {
  const user = await getCurrentUser();

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error) throw error;

  const authMetadata: Record<string, string> = {};
  if (typeof updates.full_name === 'string') authMetadata.full_name = updates.full_name;
  // 避免把较大的 data URI 写入 auth metadata，资料表才是头像主数据源。
  if (typeof updates.avatar_url === 'string' && !updates.avatar_url.startsWith('data:')) {
    authMetadata.avatar_url = updates.avatar_url;
  }

  if (Object.keys(authMetadata).length > 0) {
    const { error: authError } = await supabase.auth.updateUser({ data: authMetadata });
    if (authError) {
      console.warn('[authService] Failed to sync auth metadata:', authError.message);
    }
  }

  return data as Profile;
}

/**
 * Get current user's credit score change history, newest first.
 * 获取当前用户的信用分变动历史，按时间倒序排列。
 *
 * @returns Array of credit score log records. 信用分变动日志数组
 */
export async function getCreditScoreLogs(): Promise<CreditScoreLog[]> {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from('credit_score_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CreditScoreLog[];
}

/**
 * Update the current user's password.
 * 修改当前用户的密码。
 *
 * @param newPassword - New password (min 6 chars). 新密码（至少6位）
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

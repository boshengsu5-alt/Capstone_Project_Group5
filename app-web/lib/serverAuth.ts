import { createClient } from '@supabase/supabase-js';

/**
 * Verify that the request comes from an authenticated admin user.
 * 验证请求来自已认证的管理员用户。用于 API 路由鉴权。
 *
 * @param request - Incoming HTTP request with Authorization header.
 * @returns The authenticated user object, or null if unauthorized.
 */
export async function verifyAdmin(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    // 使用请求携带的 access_token 创建用户级 Supabase 客户端
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // 校验 admin 角色
    const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') return null;

    return user;
}

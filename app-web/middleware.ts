import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware: first-level route guard for the admin dashboard.
 * 第一层路由守卫：检查 admin session cookie 是否存在。
 *
 * 真正的 Supabase 鉴权在 dashboard/layout.tsx (页面) 和 serverAuth.ts (API) 中进行，
 * 此 middleware 提供快速拦截，避免未登录用户看到加载画面。
 */
export function middleware(request: NextRequest) {
    const adminCookie = request.cookies.get('unigear-admin');

    // 未登录用户访问 dashboard → 立即重定向到登录页
    if (!adminCookie) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// 仅对 /dashboard 及其子路由生效
export const config = {
    matcher: '/dashboard/:path*',
};

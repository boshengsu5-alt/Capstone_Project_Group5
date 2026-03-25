import { supabase } from './supabase';

/**
 * Fetch wrapper that automatically attaches the Supabase access token.
 * 自动携带 Supabase access_token 的 fetch 封装，用于调用需鉴权的 API 路由。
 *
 * @param url - Request URL (e.g. '/api/assets').
 * @param options - Standard RequestInit options.
 * @returns Fetch response.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers);

    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    return fetch(url, { ...options, headers });
}

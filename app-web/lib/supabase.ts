/**
 * Supabase Client for Web Admin Panel. Web 管理面板的 Supabase 客户端
 *
 * Usage: import { supabase } from '@/lib/supabase';
 * 使用方式：import { supabase } from '@/lib/supabase';
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../database/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Check app-web/.env.local. ' +
        '缺少 Supabase 环境变量，请检查 app-web/.env.local'
    );
}

/** Typed Supabase client instance. 带类型的 Supabase 客户端实例 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

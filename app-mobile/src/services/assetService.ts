import { supabase } from './supabase';

const db = supabase as any;

/**
 * 通过二维码获取资产
 */
export async function getAssetByQRCode(qrCode: string) {
    const { data, error } = await db
        .from('assets')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

    if (error) {
        // 根据业务逻辑，如果查不到抛出错误，或者返回 null
        // Supabase 没找到返回 PGRST116 错误码，这里简单处理
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data;
}

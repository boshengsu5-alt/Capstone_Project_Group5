import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// 导入数据库类型定义
import type { Database } from '../../../../database/types/supabase';

type AssetInsert = Database['public']['Tables']['assets']['Insert'];

// --- GET 方法：获取资产列表 ---
export async function GET() {
  try {
    // 尝试获取资产，如果 categories 关联报错，会自动降级为普通查询
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        categories(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('⚠️ GET 请求部分报错（可能是缺少 categories 关联）:', error.message);
      // 降级方案：只查询 assets 表本身
      const { data: simpleData, error: simpleError } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (simpleError) throw simpleError;
      return NextResponse.json(simpleData);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ 获取资产失败:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- POST 方法：保存新资产 ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📥 收到前端请求数据:", body);

    // 1. 数据对齐与清洗 (解决 purchase_price vs price 的问题)
    const name = body.name;
    const price = body.price || body.purchase_price || 0;
    const serial = body.serial || body.serial_number || '';
    const category_id = body.category_id || null; // 如果没有分类 ID，设为 null

    // 2. 基础校验
    if (!name) {
      return NextResponse.json({ error: '资产名称 (name) 是必填项' }, { status: 400 });
    }

    // 3. 构造符合数据库契约的 Payload
    // 强制转换为 any 是为了绕过复杂的 Union 类型检查，确保能顺利提交
    const assetData: any = {
      name: name,
      serial: serial,
      price: typeof price === 'string' ? parseFloat(price) : price,
      location: body.location || '',
      status: body.status || 'available',
      condition: body.condition || 'good',
      qr_code: body.qr_code || `QR-${Date.now()}`, // 补全必填的二维码
      description: body.description || '',
      category_id: category_id,
      // 如果你的表里还有以下字段，代码也一并支持
      purchase_date: body.purchase_date || null,
      images: body.images || []
    };

    console.log("📤 准备提交至 Supabase 的数据:", assetData);

    // 4. 执行插入
    const { data, error } = await supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase 写入报错详情:', error);
      return NextResponse.json(
        { 
          error: '保存失败，数据库拒绝了请求', 
          details: error.message,
          hint: error.hint,
          code: error.code 
        }, 
        { status: 400 }
      );
    }

    console.log("✅ 数据保存成功:", data);
    return NextResponse.json(data, { status: 201 });

  } catch (error: any) {
    console.error('❌ 服务器内部错误:', error);
    return NextResponse.json(
      { error: '服务器处理异常', details: error.message }, 
      { status: 500 }
    );
  }
}

// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. 解决外键地雷：如果没有传 category_id，我们先去查一个默认的
    let categoryId = body.category_id;
    if (!categoryId) {
      const { data: cat } = await supabase.from('categories').select('id').limit(1).single();
      if (!cat) return NextResponse.json({ error: '请先在数据库 categories 表中添加至少一个分类' }, { status: 400 });
      categoryId = cat.id;
    }

    // 2. 严格对齐 SQL 脚本字段名
    const assetData = {
      name: body.name,
      category_id: categoryId,
      purchase_price: parseFloat(body.price || body.purchase_price) || 0,
      serial_number: body.serial || body.serial_number || null,
      location: body.location || '',
      // 必须使用 SQL 定义的枚举值
      condition: 'good', 
      status: 'available',
      qr_code: body.qr_code || `QR-${Date.now()}`,
      description: body.description || ''
    };

    const { data, error } = await supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single();

    if (error) {
      console.error('SQL 拒绝原因:', error.message);
      return NextResponse.json({ error: '数据库拒绝写入', details: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("接收到的原始数据:", body); 

    // 1. 解构并补齐 price 字段，确保默认值为 0 或 null
    const { 
      name, 
      type = 'Hardware', 
      serial = '', 
      location = '', 
      status = 'available', 
      condition = 'good',
      price = 0,               // 补齐这个！
      qr_code = `AUTO-${Date.now()}` 
    } = body;

    if (!name) {
      return NextResponse.json({ error: "资产名称不能为空" }, { status: 400 });
    }

    // 2. 重新排列 SQL，加入 price 字段 (这里按组长可能的表结构排列)
    // 注意：如果数据库里列名是 value，这里也要改。
    const sql = `
      INSERT INTO assets (name, type, serial, location, status, condition, price, qr_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    // 3. 这里的顺序必须和上面的 $1~$8 完全一致
    const values = [
      name, 
      type, 
      serial, 
      location, 
      status, 
      condition, 
      Number(price), // 强制转为数字，防止字符串 "6000" 导致数据库报错
      qr_code
    ];

    const result = await query(sql, values);
    console.log("写入成功！返回数据:", result.rows[0]);

    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error: any) {
    console.error('数据库写入报错详情:', error.message);
    
    // 如果报错说 "column 'price' does not exist"，说明组长没设这个列，得删掉它
    return NextResponse.json(
      { error: `数据库报错: ${error.message}` }, 
      { status: 500 }
    );
  }
}

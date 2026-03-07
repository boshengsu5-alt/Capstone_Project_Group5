import { NextResponse } from 'next/server';
import { query } from '@/lib/db'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("接收到的数据:", body); // 调试利器：在终端看数据长啥样

    // 1. 结构化解构，给所有可能缺失的字段设置“安全默认值”
    const { 
      name, 
      type = 'Hardware', 
      serial = '', 
      location = '', 
      status = 'available', 
      condition = 'good',
      qr_code = `AUTO-${Date.now()}` 
    } = body;

    // 2. 检查必填项：如果连名字都没有，那确实不能存
    if (!name) {
      return NextResponse.json({ error: "资产名称不能为空" }, { status: 400 });
    }

    // 3. 严格对齐 001_initial_schema.sql
    const sql = `
      INSERT INTO assets (name, type, serial, location, status, condition, qr_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [name, type, serial, location, status, condition, qr_code];

    const result = await query(sql, values);
    console.log("写入成功:", result.rows[0]);

    return NextResponse.json({ success: true, data: result.rows[0] });

  } catch (error: any) {
    console.error('数据库写入报错详情:', error.message);
    // 这里会告诉你到底是哪个字段（比如 status）不符合约束
    return NextResponse.json(
      { error: `数据库报错: ${error.message}` }, 
      { status: 500 }
    );
  }
}

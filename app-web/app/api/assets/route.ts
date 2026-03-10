import { NextResponse } from 'next/server';
import { getAssets, createAsset } from '@/lib/assetService';

export async function GET() {
  try {
    const assets = await getAssets();
    return NextResponse.json(assets);
  } catch (error: any) {
    console.error('API GET /api/assets error:', error);
    return NextResponse.json(
      { error: '获取资产列表失败', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newAsset = await createAsset(body);

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error: any) {
    console.error('API POST /api/assets error:', error);
    return NextResponse.json(
      { error: '创建资产失败', details: error.message || String(error) }, 
      { status: 500 }
    );
  }
}

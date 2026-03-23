import { NextResponse, NextRequest } from 'next/server';
import { getAssets, createAsset, updateAsset, deleteAsset } from '@/lib/assetService';

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

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const updated = await updateAsset(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API PATCH /api/assets error:', error);
    return NextResponse.json(
      { error: '更新资产失败', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE /api/assets error:', error);
    return NextResponse.json(
      { error: '删除资产失败', details: error.message || String(error) },
      { status: 500 }
    );
  }
}

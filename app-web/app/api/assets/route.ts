// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { getAssets, createAsset } from '@/lib/assetService';

export async function GET() {
  try {
    const assets = await getAssets();
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    console.error('Error creating asset:', error);
    return NextResponse.json({ error: '服务器错误', details: error.message }, { status: 500 });
  }
}

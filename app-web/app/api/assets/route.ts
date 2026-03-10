import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database } from '../../../../database/types/supabase';

type AssetInsert = Database['public']['Tables']['assets']['Insert'];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*, categories(name)') // Fetch associated category name if needed
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category_id, serial_number, purchase_price, location, status, condition } = body;

    // Basic validation
    if (!name || !category_id) {
      return NextResponse.json({ error: 'Name and Category ID are required' }, { status: 400 });
    }

    // Construct the payload matching the strict Database Types contract
    const assetData: AssetInsert = {
      name,
      category_id,
      serial_number: serial_number || null,
      purchase_price: purchase_price ? parseFloat(purchase_price) : null,
      location: location || '',
      status: status || 'available',
      condition: condition || 'good',
      // Optional defaults depending on your API needs
      description: body.description || '',
      images: body.images || [],
      warranty_status: body.warranty_status || 'none',
      qr_code: body.qr_code || null,
      purchase_date: body.purchase_date || null,
      warranty_expiry: body.warranty_expiry || null,
      created_by: null // Assuming auth will handle this later, or RLS is set up
    };

    const { data, error } = await supabase
      .from('assets')
      .insert([assetData] as any) // Cast to any to bypass strict generic inference bug in supabase-js with complex unions
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error details:', error);
      return NextResponse.json(
        {
          error: 'Failed to save asset',
          details: error.message,
          code: error.code
        },
        { status: 400 } // Often 400 for constraint violations like unique serial_number
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error creating asset:', error);
    return NextResponse.json(
      {
        error: 'Terminal server error saving asset',
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

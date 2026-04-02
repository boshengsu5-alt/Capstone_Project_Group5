import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

async function main() {
  console.log('=== Step 1: Authenticate as Admin ===');
  // Use fetch to login to bypass module restrictions if needed, but we can try client first
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await supabaseAuth.auth.signInWithPassword({
    email: 'admin@centria.fi',
    password: '123456'
  });

  if (authErr) {
    console.error('Auth failed:', authErr.message);
    return;
  }

  const token = authData.session.access_token;
  console.log('✅ Authenticated successfully.');

  // Use the authenticated supabaseAuth client for all requests!
  const supabase = supabaseAuth;

  console.log('\n=== Step 2: Data Cleaning ===');
  const badNames = ['test', 'regression', 'aaa'];
  
  // Clean assets
  for (const nameObj of badNames) {
    const { count, error } = await supabase
      .from('assets')
      .delete()
      .ilike('name', `%${nameObj}%`);
      
    if (error) console.log(`Error deleting assets matching ${nameObj}:`, error.message);
  }
  console.log('✅ Useless assets removed.');

  // Clean users (profiles)
  for (const nameObj of badNames) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .ilike('full_name', `%${nameObj}%`);
      
    if (error) console.log(`Error deleting profiles matching ${nameObj}:`, error.message);
  }
  console.log('✅ Useless profiles removed (or ignored if RLS blocked it).');

  console.log('\n=== Step 3: Fetch Categories ===');
  const { data: categories } = await supabase.from('categories').select('*');
  const getCatId = (name) => {
    const cat = categories.find(c => c.name === name);
    return cat ? cat.id : categories[0].id; // Fallback
  };

  console.log('\n=== Step 4: Asset Completion ===');
  const { data: assetsList } = await supabase.from('assets').select('id, name');
  
  const additionalAssets = [
    {
      name: 'Sony A7S III',
      description: 'Full-frame mirrorless camera for video production',
      serial_number: `SN-CAM-2024-100`, qr_code: `QR-CAM-100`, condition: 'new',
      status: 'available', location: 'Media Studio', 
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', 'https://images.unsplash.com/photo-1606986628170-f0c86dbd80db?w=800'],
      category_id: getCatId('Cameras & Media'), warranty_status: 'none', purchase_price: 3499, purchase_date: '2024-01-01'
    },
    {
      name: 'Dell XPS 15',
      description: 'Performance laptop, i9, 32GB RAM, OLED',
      serial_number: `SN-LAP-2024-101`, qr_code: `QR-LAP-101`, condition: 'good',
      status: 'available', location: 'IT Lab', 
      images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
      category_id: getCatId('Electronics'), warranty_status: 'none', purchase_price: 2499, purchase_date: '2024-01-01'
    },
    {
      name: 'Epson Pro Cinema 4K',
      description: 'High-end home theater projector',
      serial_number: `SN-PROJ-2024-102`, qr_code: `QR-PROJ-102`, condition: 'good',
      status: 'available', location: 'Theater Room', 
      images: ['https://images.unsplash.com/photo-1601944179066-29786cb9d32a?w=800'],
      category_id: getCatId('Electronics'), warranty_status: 'none', purchase_price: 1999, purchase_date: '2024-01-01'
    },
    {
      name: 'Formlabs Form 3+',
      description: 'High-precision SLA 3D Printer',
      serial_number: `SN-3DP-2024-103`, qr_code: `QR-3DP-103`, condition: 'new',
      status: 'available', location: 'Maker Space', 
      images: ['https://images.unsplash.com/photo-1553484771-371a605b060b?w=800'],
      category_id: getCatId('Lab Equipment'), warranty_status: 'none', purchase_price: 3750, purchase_date: '2024-01-01'
    },
    {
      name: 'Fluke 87V MAX',
      description: 'True-RMS Digital Multimeter',
      serial_number: `SN-TOOL-2024-104`, qr_code: `QR-TOOL-104`, condition: 'new',
      status: 'available', location: 'Engineering Lab B', 
      images: ['https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800'],
      category_id: getCatId('Lab Equipment'), warranty_status: 'none', purchase_price: 450, purchase_date: '2024-01-01'
    },
    {
      name: 'Concept2 RowErg',
      description: 'Indoor rowing machine with PM5 monitor',
      serial_number: `SN-FIT-2024-105`, qr_code: `QR-FIT-105`, condition: 'good',
      status: 'available', location: 'Gym', 
      images: ['https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'],
      category_id: getCatId('Sports & Fitness'), warranty_status: 'none', purchase_price: 990, purchase_date: '2024-01-01'
    },
    {
      name: 'Shure SM7B',
      description: 'Vocal dynamic microphone',
      serial_number: `SN-AUD-2024-106`, qr_code: `QR-AUD-106`, condition: 'new',
      status: 'available', location: 'Podcast Studio', 
      images: ['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800'],
      category_id: getCatId('Audio & Sound'), warranty_status: 'none', purchase_price: 399, purchase_date: '2024-01-01'
    },
    {
      name: 'Herman Miller Aeron',
      description: 'Ergonomic office chair, size B',
      serial_number: `SN-FUR-2024-107`, qr_code: `QR-FUR-107`, condition: 'good',
      status: 'available', location: 'Lab Office', 
      images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
      category_id: getCatId('Furniture'), warranty_status: 'none', purchase_price: 1200, purchase_date: '2024-01-01'
    },
    {
      name: 'Arduino Uno R3 Kit',
      description: 'Starter kit with sensors and breadboard',
      serial_number: `SN-KIT-2024-108`, qr_code: `QR-KIT-108`, condition: 'good',
      status: 'available', location: 'Electronics Lab', 
      images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'],
      category_id: getCatId('Books & Materials'), warranty_status: 'none', purchase_price: 99, purchase_date: '2024-01-01'
    },
    {
      name: 'Master Server Rack Key',
      description: 'Server room physical access key',
      serial_number: `SN-KEY-2024-109`, qr_code: `QR-KEY-109`, condition: 'good',
      status: 'available', location: 'Admin Desk', 
      images: ['https://images.unsplash.com/photo-1584985429926-08867327d3a6?w=800'],
      category_id: getCatId('Keys & Access'), warranty_status: 'none', purchase_price: 0, purchase_date: '2024-01-01'
    }
  ];

  // We want to make sure we have exactly 20+ records. Let's just insert these additional 10 items 
  // without deleting existing nice items.
  for (const asset of additionalAssets) {
    const exists = assetsList.some(a => a.name === asset.name);
    if (!exists) {
      const { error } = await supabase.from('assets').insert(asset);
      if (error) console.log(`Insert failed for ${asset.name}:`, error.message);
    }
  }
  console.log('✅ Inserted diverse assets with realistic images.');

  console.log('\n=== Step 5: State Presetting ===');
  
  // 1 pending booking
  // Check if we have one. If not, create one.
  const { data: bookings } = await supabase.from('bookings').select('id, status, asset_id').eq('status', 'pending');
  if (bookings && bookings.length > 0) {
    console.log('✅ Pending booking already exists.');
  } else {
    // Find an available asset and someone to book it
    const { data: availableAssets } = await supabase.from('assets').select('id').eq('status', 'available').limit(1);
    // Find a random user who isn't test
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    
    if (availableAssets.length > 0 && users.length > 0) {
       const b_start = new Date(); b_start.setDate(b_start.getDate() + 1);
       const b_end = new Date(); b_end.setDate(b_end.getDate() + 5);
       await supabase.from('bookings').insert({
         asset_id: availableAssets[0].id,
         borrower_id: users[0].id,
         start_time: b_start.toISOString(),
         end_time: b_end.toISOString(),
         status: 'pending',
         purpose: 'Demo Pending Booking'
       });
       // mark asset as reserved
       await supabase.from('assets').update({status: 'reserved'}).eq('id', availableAssets[0].id);
       console.log('✅ Created 1 pending booking.');
    }
  }

  // 1 investigating damage report
  const { data: incidents } = await supabase.from('damage_reports').select('id, status').eq('status', 'investigating');
  if (incidents && incidents.length > 0) {
    console.log('✅ Investigating damage report already exists.');
  } else {
    // First need an active or returned booking.
    const { data: existingBookings } = await supabase.from('bookings')
      .select('id, asset_id')
      .in('status', ['active', 'returned'])
      .limit(1);
    
    let bookingIdToUse = null;
    let assetIdToUse = null;
    
    if (existingBookings.length > 0) {
      bookingIdToUse = existingBookings[0].id;
      assetIdToUse = existingBookings[0].asset_id;
    } else {
      // Create a dummy returned booking
      const { data: availableAssets } = await supabase.from('assets').select('id').eq('status', 'available').limit(1);
      const { data: users } = await supabase.from('profiles').select('id').limit(1);
      
      const b_start = new Date(); b_start.setDate(b_start.getDate() - 5);
      const b_end = new Date(); b_end.setDate(b_end.getDate() - 1);
      const { data: newB } = await supabase.from('bookings').insert({
         asset_id: availableAssets[0].id,
         borrower_id: users[0].id,
         start_time: b_start.toISOString(),
         end_time: b_end.toISOString(),
         status: 'returned',
         purpose: 'Demo incident booking'
      }).select();
      if(newB && newB.length) {
         bookingIdToUse = newB[0].id;
         assetIdToUse = availableAssets[0].id;
      }
    }
    
    if (bookingIdToUse) {
       await supabase.from('damage_reports').insert({
         booking_id: bookingIdToUse,
         asset_id: assetIdToUse,
         description: 'Screen is cracked during transport.',
         status: 'investigating',
         severity: 'moderate'
       });
       // Set the asset condition to damaged or status to maintenance
       await supabase.from('assets').update({ condition: 'damaged', status: 'maintenance' }).eq('id', assetIdToUse);
       console.log('✅ Created 1 investigating damage report.');
    }
  }
  
  console.log('\n=== script completed ===');
}

main().catch(console.error);

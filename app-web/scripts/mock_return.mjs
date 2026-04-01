
const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

async function main() {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '123456@qq.com', password: '123456' }),
  });

  const authData = await authRes.json();
  const accessToken = authData.access_token;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const bookingsRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?limit=50`, { headers });
  const bookings = await bookingsRes.json();
  const bookingToReturn = bookings.find((b) =>
    ['active', 'overdue'].includes(b.status)
      && !b.actual_return_date
  );

  if (!bookingToReturn) {
    console.error('No active/overdue booking without a return record was found. Refusing to mock an invalid return.');
    return;
  }

  const target = bookingToReturn;
  console.log(`Mocking return for booking ID: ${target.id}`);

  // Patch the booking
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${target.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status: 'returned',
      actual_return_date: new Date().toISOString(),
      return_photo_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=1000'
    })
  });

  const patchData = await patchRes.json();
  console.log('Patch result:', patchData);
  
}

main().catch(console.error);

/**
 * 用已认证 session token 验证 bookings 行数
 * Token 从 Supabase 登录接口获取
 */

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

async function main() {
  console.log('=== Step 1: Authenticate as 123456@qq.com ===');
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: '123456@qq.com', password: '123456' }),
  });

  if (!authRes.ok) {
    const err = await authRes.text();
    console.error('Auth failed:', err);
    return;
  }

  const authData = await authRes.json();
  const accessToken = authData.access_token;
  console.log('✅ Authenticated. Token expires:', new Date(authData.expires_at * 1000).toISOString());

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  console.log('\n=== Step 2: Query Tables with Auth Token ===\n');

  // Assets
  const assetsRes = await fetch(`${SUPABASE_URL}/rest/v1/assets?select=id,status,is_archived&limit=1000`, { headers });
  const assets = await assetsRes.json();
  const activeAssets = assets.filter(a => !a.is_archived);
  const assetsByStatus = activeAssets.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1; return acc;
  }, {});

  console.log('【Assets】');
  console.log(`  Total (all):          ${assets.length}`);
  console.log(`  Active (is_archived=false): ${activeAssets.length}`);
  console.log(`  By status (active only):`, JSON.stringify(assetsByStatus));

  // Bookings
  const bookingsRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id,status&limit=1000`, { headers });
  if (!bookingsRes.ok) {
    const err = await bookingsRes.text();
    console.error('Bookings query failed:', err.substring(0, 200));
  } else {
    const bookings = await bookingsRes.json();
    const bookingsByStatus = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1; return acc;
    }, {});
    console.log('\n【Bookings】');
    console.log(`  Total:                ${bookings.length}`);
    console.log(`  By status:           `, JSON.stringify(bookingsByStatus));
  }

  console.log('\n=== Step 3: Accuracy Comparison ===\n');
  console.log('Dashboard UI shows:');
  console.log('  Total Assets:      21');
  console.log('  Currently Loaned:  0');
  console.log('  Pending Approval:  1');
  console.log('  Overdue:           0');
  console.log('\nDatabase truth:');
  console.log(`  Total Assets (is_archived=false): ${activeAssets.length} ← should match 21`);
  console.log(`  Borrowed assets (status=borrowed): ${assetsByStatus['borrowed'] || 0} ← should match 0 (Loaned)`);
}

main().catch(console.error);

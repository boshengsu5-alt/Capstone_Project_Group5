/**
 * 深度诊断：检查 bookings 表 RLS 及行数
 */

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Accept': 'application/json',
};

async function queryTable(table, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}&limit=1000`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log(`\n[${table}] Status: ${res.status}`);
  
  if (res.status !== 200) {
    console.log('Error:', text.substring(0, 300));
    return null;
  }
  
  try {
    const data = JSON.parse(text);
    console.log(`Row count: ${data.length}`);

    // Count by status
    if (data.length > 0 && data[0].status !== undefined) {
      const byStat = data.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      }, {});
      console.log('By status:', JSON.stringify(byStat));
    }
    return data;
  } catch {
    console.log('Parse error');
    return null;
  }
}

async function main() {
  console.log('=== 深度诊断查询 ===');

  // Check assets table in detail
  await queryTable('assets', 'select=id,status,is_archived');
  
  // Check bookings with just id and status
  await queryTable('bookings', 'select=id,status');

  // Try fetching with count header
  const url = `${SUPABASE_URL}/rest/v1/bookings?select=count`;
  const res = await fetch(url, { 
    headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
  });
  const cr = res.headers.get('content-range');
  console.log(`\n[bookings count via Prefer] content-range:`, cr);
  console.log('Status:', res.status);
}

main().catch(console.error);

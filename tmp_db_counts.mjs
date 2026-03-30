/**
 * 数据库行数查询脚本
 * 直接调用 Supabase REST API，获取各表的真实行数，用于对比 Dashboard 显示数值
 */

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Accept': 'application/json',
  'Prefer': 'count=exact',
};

async function countTable(table, filters = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id${filters}&limit=1`;
  const res = await fetch(url, { headers: { ...headers, 'Range': '0-0' } });
  const contentRange = res.headers.get('content-range'); // e.g. "0-0/42"
  if (contentRange) {
    const total = contentRange.split('/')[1];
    return parseInt(total, 10);
  }
  return '(unknown)';
}

async function main() {
  console.log('=== Supabase 真实行数查询 ===\n');

  // 1. Total Assets (non-archived)
  const totalAssets = await countTable('assets', '&is_archived=eq.false');
  console.log(`✦ assets (is_archived=false):      ${totalAssets}`);

  // 2. All assets (including archived)
  const allAssets = await countTable('assets');
  console.log(`✦ assets (total including archived): ${allAssets}`);

  // 3. Currently Loaned (status = borrowed)
  const loanedAssets = await countTable('assets', '&is_archived=eq.false&status=eq.borrowed');
  console.log(`✦ assets (borrowed, non-archived): ${loanedAssets}`);

  // 4. Pending Bookings
  const pendingBookings = await countTable('bookings', '&status=eq.pending');
  console.log(`✦ bookings (pending):              ${pendingBookings}`);

  // 5. Overdue Bookings
  const overdueBookings = await countTable('bookings', '&status=eq.overdue');
  console.log(`✦ bookings (overdue):              ${overdueBookings}`);

  // 6. All bookings
  const allBookings = await countTable('bookings');
  console.log(`✦ bookings (total):                ${allBookings}`);

  // 7. Available assets
  const availableAssets = await countTable('assets', '&is_archived=eq.false&status=eq.available');
  console.log(`✦ assets (available, non-archived): ${availableAssets}`);

  console.log('\n=== 查询完成 ===');
  console.log('\n⚠️  Dashboard 显示逻辑说明:');
  console.log('  - Total Assets  = assets WHERE is_archived=false');
  console.log('  - Currently Loaned = assets WHERE is_archived=false AND status=borrowed');
  console.log('  - Pending Approval = bookings WHERE status=pending');
  console.log('  - Overdue = bookings WHERE status=overdue');
}

main().catch(console.error);

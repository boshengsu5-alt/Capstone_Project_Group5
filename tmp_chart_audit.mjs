/**
 * 深度数据审计：is_archived 过滤、分类分布、图表数据完整性
 */

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

async function main() {
  // Authenticate
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '123456@qq.com', password: '123456' }),
  });
  const { access_token } = await authRes.json();
  const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' };

  console.log('=== 数据审计 1：is_archived 过滤验证 ===\n');
  
  const allAssetsRes = await fetch(`${SUPABASE_URL}/rest/v1/assets?select=id,name,status,is_archived,category_id,created_at,purchase_date&limit=1000`, { headers });
  const allAssets = await allAssetsRes.json();
  
  const archived = allAssets.filter(a => a.is_archived === true);
  const active = allAssets.filter(a => a.is_archived === false || a.is_archived === null);
  
  console.log(`全部资产（含归档）: ${allAssets.length}`);
  console.log(`活跃资产 (is_archived=false): ${active.length}`);
  console.log(`已归档 (is_archived=true): ${archived.length}`);
  console.log(`Dashboard 显示数: 21（应等于活跃资产数）`);
  console.log(`✅ KPI 筛选正确: ${active.length === 21 ? 'YES' : '❌ NO'}\n`);
  
  if (archived.length > 0) {
    console.log('已归档资产列表:');
    archived.forEach(a => console.log(`  - [${a.id.slice(0,8)}...] ${a.name} (${a.status})`));
  }

  console.log('\n=== 数据审计 2：分类分布（饼图数据源）===\n');
  
  // Get categories
  const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name&limit=100`, { headers });
  const allCategories = await catRes.json();
  
  // Count assets per category (active only)
  const catCounts = {};
  active.forEach(a => {
    const catId = a.category_id || '__none__';
    catCounts[catId] = (catCounts[catId] || 0) + 1;
  });
  
  console.log('所有分类 vs 持有资产数:');
  allCategories.forEach(cat => {
    const count = catCounts[cat.id] || 0;
    const marker = count === 0 ? '⚠️ 空分类（0资产）' : '✅';
    console.log(`  ${marker} ${cat.name}: ${count} 个资产`);
  });
  
  const assetsNoCategory = active.filter(a => !a.category_id);
  console.log(`\n无分类资产: ${assetsNoCategory.length}`);
  
  console.log('\n=== 数据审计 3：面积图数据源（Growth Trend）===\n');
  
  // Simulate processGrowthData() logic
  const monthData = active.map(asset => {
    const dateStr = asset.purchase_date || asset.created_at;
    if (!dateStr) return new Date().toISOString().slice(0, 7);
    const date = new Date(dateStr);
    return isNaN(date.getTime()) 
      ? new Date().toISOString().slice(0, 7)
      : date.toISOString().slice(0, 7);
  }).sort();
  
  const counts = monthData.reduce((acc, month) => {
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});
  
  let cumulative = 0;
  const growthData = Object.keys(counts).sort().map(month => {
    cumulative += counts[month];
    return { month, total: cumulative };
  });
  
  console.log('面积图数据点（模拟 processGrowthData()）:');
  growthData.forEach(d => console.log(`  ${d.month}: ${d.total} 累计`));
  console.log(`\n最小数据点: ${growthData.length}`);
  console.log(`最终累计: ${growthData[growthData.length-1]?.total || 0}（应 = ${active.length}）`);
  
  // Edge case: assets with no date
  const noDate = active.filter(a => !a.purchase_date && !a.created_at);
  console.log(`\n无日期资产（会被分配到当前月）: ${noDate.length}`);
  
  // Check for invalid dates
  const invalidDate = active.filter(a => {
    const d = a.purchase_date || a.created_at;
    return d && isNaN(new Date(d).getTime());
  });
  console.log(`无效日期资产（会被回退到当前月）: ${invalidDate.length}`);

  console.log('\n=== 数据审计 4：饼图颜色覆盖检查 ===\n');
  const PIE_COLORS = ['#8884d8', '#f6ad55', '#4fd1c5', '#f687b3'];
  
  // Count unique categories that have at least 1 asset
  const categoryNames = [...new Set(active.map(a => {
    // Dashboard uses asset.categories?.name which requires joined query  
    return a.category_id || 'Uncategorized';
  }))];
  
  console.log(`有资产的分类数: ${categoryNames.length}`);
  console.log(`饼图颜色数组长度: ${PIE_COLORS.length}`);
  if (categoryNames.length > PIE_COLORS.length) {
    console.log(`⚠️ Bug: 分类数(${categoryNames.length}) > 颜色数(${PIE_COLORS.length})，超出部分会循环使用颜色`);
  } else {
    console.log(`✅ 颜色覆盖充足（颜色按 index % length 循环，不会报错）`);
  }

  console.log('\n=== 完成 ===');
}

main().catch(console.error);

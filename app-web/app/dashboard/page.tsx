'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { Asset } from '@/types/database';
import { getAssets } from '@/lib/assetService';
import { supabase } from '@/lib/supabase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { bookingService, BookingWithDetails } from '@/lib/bookingService';

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [assetsData, bookingsData] = await Promise.all([
        getAssets(),
        bookingService.getBookings(),
      ]);
      setAssets(assetsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // --- Realtime Subscription ---
    const channel = (supabase as any)
      .channel('dashboard-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Realtime update detected in bookings. Refreshing dashboard data...');
          fetchData(); // Partial refresh of data states
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Data Processing for Charts ---
  
  // 1. Pie Chart Data: Category Distribution
  const pieData = assets.reduce((acc: any[], asset: any) => {
    const categoryName = asset.categories?.name || 'Uncategorized';
    const existing = acc.find(item => item.name === categoryName);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: categoryName, value: 1 });
    }
    return acc;
  }, []);

  const PIE_COLORS = ['#8884d8', '#f6ad55', '#4fd1c5', '#f687b3'];

  // 2. Line/Area Chart Data: Growth Trend
  const processGrowthData = () => {
    if (!assets || assets.length === 0) return [];

    try {
      // Map assets to months based on purchase_date or created_at
      const monthData = assets.map(asset => {
        const dateStr = asset?.purchase_date || asset?.created_at;
        if (!dateStr) return new Date().toISOString().slice(0, 7);
        const date = new Date(dateStr);
        // Fallback if date is invalid
        const yearMonth = isNaN(date.getTime()) 
          ? new Date().toISOString().slice(0, 7) // Default to current month if invalid
          : date.toISOString().slice(0, 7); 
        return yearMonth;
      }).sort();

      // Count per month
      const counts = monthData.reduce((acc: Record<string, number>, month) => {
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      // Cumulative sum
      let cumulative = 0;
      const sortedMonths = Object.keys(counts).sort();
      return sortedMonths.map(month => {
        cumulative += counts[month];
        return {
          month,
          total: cumulative
        };
      });
    } catch (err) {
      console.error('Error processing growth data:', err);
      return [];
    }
  };

  const growthData = processGrowthData();

  // Statistics calculation: Assets from database, Bookings status handling
  const totalAssets = assets.length;
  const loanedAssets = assets.filter(a => a.status === 'borrowed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const overdueBookings = bookings.filter(b => b.status === 'overdue').length;

  const categoriesMap = assets.reduce((acc, asset) => {
    const cat = (asset as any).categories;
    if (cat) {
      acc[cat.id] = cat.name;
    }
    return acc;
  }, {} as Record<string, string>);
  const categories = Object.entries(categoriesMap).map(([id, name]) => ({ id, name }));
  
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (asset.serial_number && asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || asset.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 border border-purple-500/30 backdrop-blur-md p-3 rounded-xl shadow-2xl">
          <p className="text-gray-400 text-xs font-semibold mb-1">{label || payload[0].name}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill || payload[0].color }} />
            <p className="text-white font-bold text-sm">
              {payload[0].value} {payload[0].name === 'total' ? 'Assets' : ''}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto font-sans selection:bg-purple-500/30">
      <Header />
      
      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-10">
        
        {/* --- KPI Cards (Day 6): 四个核心计数卡片 --- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalAssets}</p>
              <p className="text-xs text-gray-500">Total Assets</p>
            </div>
          </div>
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{loanedAssets}</p>
              <p className="text-xs text-gray-500">Currently Loaned</p>
            </div>
          </div>
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pendingBookings}</p>
              <p className="text-xs text-gray-500">Pending Approval</p>
            </div>
          </div>
          <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{overdueBookings}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </section>

        {/* --- Charts Section: Visual Reports --- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Block: Pie Chart (Asset Category Distribution) */}
          <div className="lg:col-span-4 bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col h-[400px]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Asset Distribution
              </h3>
              <p className="text-gray-500 text-xs px-7">By Category</p>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.05)" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value: string) => <span className="text-xs text-gray-400 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Block: Area Chart (Asset Growth Trend) */}
          <div className="lg:col-span-8 bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col h-[400px]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                  Inventory Growth
                </h3>
                <p className="text-gray-500 text-xs px-7">Cumulative Total Trend</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Total Assets: {totalAssets}
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* --- Bottom Section: Assets Table --- */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Active Inventory</h2>
              <p className="text-gray-400 text-sm mt-1">Real-time status of all registered hardware and equipment.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative w-full sm:w-72 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search assets..."
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Filter */}
              <div className="flex items-center gap-2 bg-gray-900/50 border border-white/10 rounded-xl px-3 py-1">
                <Filter className="w-4 h-4 text-gray-500" />
                <select 
                  className="bg-transparent text-sm text-gray-300 focus:outline-none py-1 cursor-pointer"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All" className="bg-gray-900">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-gray-900/20 backdrop-blur-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Asset Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Identifier</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Condition</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-gray-500 text-sm">Syncing with database...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic">
                       No assets match your current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssets && filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-purple-500/10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5">
                              {asset.images && asset.images.length > 0 ? (
                                <img src={asset.images[0]} alt={asset.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-purple-400" />
                              )}
                           </div>
                           <div>
                              <p className="font-semibold text-white truncate max-w-[180px]">{asset.name}</p>
                              <p className="text-xs text-gray-500">{asset.location}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           {asset.qr_code && (
                             <div className="p-1 bg-white rounded shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                <QRCodeSVG value={asset.qr_code} size={24} />
                             </div>
                           )}
                           <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded">
                              {asset.serial_number || 'NO-SN'}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400">{(asset as any).categories?.name || 'General'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          asset.status === 'available' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          asset.status === 'borrowed' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          asset.status === 'maintenance' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                          asset.status === 'retired' && "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {asset.status === 'borrowed' ? 'Loaned' : asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 capitalize">
                         <span className="text-sm font-medium text-gray-300">{asset.condition}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
                           Explore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}

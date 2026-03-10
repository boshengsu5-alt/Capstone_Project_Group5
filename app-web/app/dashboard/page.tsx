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

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchAssetsData = async () => {
    try {
      setIsLoading(true);
      const data = await getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to fetch assets', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsData();
  }, []);

  // Statistics calculation
  const totalAssets = assets.length;
  const loanedAssets = assets.filter(a => a.status === 'borrowed' || (a.status as string) === 'loaned').length;
  const pendingAssets = assets.filter(a => (a.status as string) === 'pending_approval').length;
  const overdueAssets = assets.filter(a => a.warranty_status === 'expired').length;

  const categoriesMap = assets.reduce((acc, asset: any) => {
    if (asset.categories) {
      acc[asset.categories.id] = asset.categories.name;
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

  const StatCard = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: number, colorClass: string }) => (
    <div className="flex items-center gap-4 bg-gray-900/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl hover:border-purple-500/50 transition-all duration-300 group">
      <div className={cn("p-3 rounded-xl bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
        <Icon className={cn("w-6 h-6", colorClass)} />
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#050505] text-gray-100 overflow-y-auto font-sans selection:bg-purple-500/30">
      <Header />
      
      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-10">
        
        {/* --- Top Section: Stats Summary --- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Block: Core Stats */}
          <div className="grid grid-cols-2 gap-6 bg-gradient-to-br from-gray-900/40 to-black/40 p-1 rounded-3xl border border-white/5 ring-1 ring-white/5 backdrop-blur-sm">
             <div className="p-6 grid grid-cols-1 gap-6">
                <StatCard 
                  icon={Package} 
                  label="Total Assets" 
                  value={totalAssets} 
                  colorClass="text-purple-400" 
                />
                <StatCard 
                  icon={ArrowUpRight} 
                  label="Loaned" 
                  value={loanedAssets} 
                  colorClass="text-amber-400" 
                />
             </div>
             <div className="p-6 grid grid-cols-1 gap-6">
                <StatCard 
                  icon={Clock} 
                  label="Pending" 
                  value={pendingAssets} 
                  colorClass="text-blue-400" 
                />
                <StatCard 
                  icon={AlertTriangle} 
                  label="Overdue" 
                  value={overdueAssets} 
                  colorClass="text-rose-400" 
                />
             </div>
          </div>

          {/* Right Block: Decorative / Quick Action */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/20 via-black to-gray-900/20 p-8 flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-10 opacity-10">
                <Package className="w-48 h-48 text-purple-500 -rotate-12" />
            </div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-amber-200">
               Welcome to UniGear Admin
            </h2>
            <p className="mt-4 text-gray-400 max-w-md leading-relaxed">
               Monitor your equipment, manage loans, and track maintenance status from a single unified workspace.
            </p>
            <div className="mt-8 flex gap-4">
               <button className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2">
                  View Reports <ExternalLink className="w-4 h-4" />
               </button>
               <button className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all border border-white/10 flex items-center gap-2">
                  System Settings <ChevronRight className="w-4 h-4" />
               </button>
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
                  {categories.map((cat: any) => (
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
                  filteredAssets.map((asset) => (
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

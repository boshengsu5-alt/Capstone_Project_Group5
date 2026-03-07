"use client";

import { useState } from "react";
import { CreateAssetPayload } from '@/lib/database.types';

export default function Dashboard() {
  const [formData, setFormData] = useState<CreateAssetPayload>({
    name: '',
    type: 'Hardware',
    serial: '',
    location: '',
    status: 'available',    // 严格对应组长 SQL 的枚举
    condition: 'good',      // 严格对应组长 SQL 的枚举
    qr_code: '',            // 组长要求的核心字段
  });

  const [message, setMessage] = useState("");

  const handleSave = async () => {
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          qr_code: `QR-${Date.now()}` // 自动生成一个临时二维码
        }),
      });

      if (response.ok) {
        setMessage("✅ 成功！数据已入库 (Supabase Active)");
        setFormData({ name: '', type: 'Hardware', serial: '', location: '', status: 'available', condition: 'good', qr_code: '' });
      } else {
        const err = await response.json();
        setMessage(`❌ 失败: ${err.error || "未知错误"}`);
      }
    } catch (error) {
      setMessage("❌ 网络错误，请检查 API 路由");
    }
  };

  return (
    <div className="p-10 bg-zinc-50 min-h-screen dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-6">资产管理系统 (Letao 版)</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">资产名称</label>
            <input 
              className="w-full p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="例如: MacBook Pro 2024"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">状态</label>
              <select 
                className="w-full p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="available">空闲 (Available)</option>
                <option value="borrowed">借出 (Borrowed)</option>
                <option value="maintenance">维修 (Maintenance)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">健康状况</label>
              <select 
                className="w-full p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.condition}
                onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
              >
                <option value="new">全新 (New)</option>
                <option value="good">良好 (Good)</option>
                <option value="damaged">损坏 (Damaged)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            保存到 Supabase 数据库
          </button>

          {message && (
            <div className={`p-4 rounded-lg text-center font-medium ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

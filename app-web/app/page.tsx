"use client";

import { useState } from "react";
// 使用 Agent 为你生成的数据库契约类型
import { CreateAssetPayload } from '@/lib/database.types';

export default function AssetDashboard() {
  // 1. 初始化表单，加入组长要求的必填字段
  const [formData, setFormData] = useState<CreateAssetPayload>({
    name: '',
    type: 'Hardware',
    serial: '',
    location: '',
    status: 'available',    // 必须是 SQL 里的枚举值
    condition: 'good',      // 必须是 SQL 里的枚举值
    qr_code: '',            // 组长点名要的核心字段
  });

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    
    try {
      // 2. 发送请求，自动补全二维码，确保数据库不报错
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          qr_code: formData.qr_code || `QR-${Date.now()}` 
        }),
      });

      if (response.ok) {
        setMessage("✅ 成功！数据已存入 Supabase 数据库");
        setFormData({ name: '', type: 'Hardware', serial: '', location: '', status: 'available', condition: 'good', qr_code: '' });
      } else {
        const err = await response.json();
        setMessage(`❌ 失败: ${err.error || "字段约束不匹配"}`);
      }
    } catch (error) {
      setMessage("❌ 网络错误: 请确认数据库已恢复");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 bg-zinc-50 min-h-screen dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-8 text-center">资产管理 (全栈联调版)</h1>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">资产名称 *</label>
            <input 
              className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="请输入资产名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">使用状态</label>
              <select 
                className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="available">空闲 (Available)</option>
                <option value="borrowed">借出 (Borrowed)</option>
                <option value="maintenance">维修 (Maintenance)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">健康状况</label>
              <select 
                className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
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
            disabled={isSaving || !formData.name}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
              isSaving ? 'bg-zinc-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isSaving ? "同步中..." : "保存到 Supabase"}
          </button>

          {message && (
            <div className={`p-4 rounded-xl text-center font-bold animate-bounce ${
              message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

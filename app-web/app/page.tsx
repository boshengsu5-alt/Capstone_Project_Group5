"use client";

import { useState } from "react";
// 引入 Agent 为你生成的数据库契约类型
import { CreateAssetPayload } from '@/lib/database.types';

export default function AssetDashboard() {
  // 1. 初始化表单状态，严格对齐数据库字段
  const [formData, setFormData] = useState<CreateAssetPayload>({
    name: '',
    type: 'Hardware',
    serial: '',
    location: '',
    status: 'available',    // 严格对应枚举: available, borrowed, maintenance, retired
    condition: 'good',      // 严格对应枚举: new, good, fair, poor, damaged
    qr_code: '',            // 组长点名要的核心字段
  });

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 2. 核心保存逻辑
  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    
    try {
      // 调用你刚刚在 app/api/assets/route.ts 创建的后端接口
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          qr_code: formData.qr_code || `QR-${Date.now()}` // 如果没填，自动生成唯一码
        }),
      });

      if (response.ok) {
        setMessage("✅ 成功！数据已存入已恢复的 Supabase 数据库");
        setFormData({ name: '', type: 'Hardware', serial: '', location: '', status: 'available', condition: 'good', qr_code: '' });
      } else {
        const err = await response.json();
        // 精确拦截错误原因，不再只会报 "Failed to save asset"
        setMessage(`❌ 失败: ${err.error || "数据库约束检查未通过"}`);
        console.error('Failed to save asset', err);
      }
    } catch (error) {
      setMessage("❌ 网络错误: 请确认 Supabase 项目已 Restore");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen dark:bg-zinc-950 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            资产管理控制台 <span className="text-sm font-normal text-zinc-500 ml-2">v1.0 (Letao)</span>
          </h1>
          <p className="text-zinc-500 mt-2">当前连接状态: {isSaving ? "正在同步数据库..." : "已就绪"}</p>
        </header>

        <main className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="grid gap-6">
            {/* 资产基础信息 */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">资产名称 *</label>
                <input 
                  className="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="如: MacBook Pro 16"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">序列号 (Serial)</label>
                <input 
                  className="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700"
                  value={formData.serial || ''}
                  onChange={(e) => setFormData({...formData, serial: e.target.value})}
                />
              </div>
            </div>

            {/* 枚举类型选择器 - 严格对齐 001_initial_schema.sql */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">使用状态 (Status)</label>
                <select 
                  className="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="available">空闲 (Available)</option>
                  <option value="borrowed">借出 (Borrowed)</option>
                  <option value="maintenance">维修 (Maintenance)</option>
                  <option value="retired">报废 (Retired)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">健康状况 (Condition)</label>
                <select 
                  className="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700"
                  value={formData.condition}
                  onChange={(e) => setFormData({...formData, condition: e.target.value as any})}
                >
                  <option value="new">全新 (New)</option>
                  <option value="good">良好 (Good)</option>
                  <option value="fair">一般 (Fair)</option>
                  <option value="damaged">损坏 (Damaged)</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving || !formData.name}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                isSaving ? 'bg-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
            >
              {isSaving ? "正在提交..." : "立即保存至数据库"}
            </button>

            {message && (
              <div className={`p-4 rounded-xl text-center text-sm font-semibold animate-in fade-in slide-in-from-bottom-2 ${
                message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

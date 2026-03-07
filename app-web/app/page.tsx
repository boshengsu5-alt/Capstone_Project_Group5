"use client";

import { useState } from "react";
// 使用 Agent 为你生成的数据库契约类型
import { CreateAssetPayload } from '@/lib/database.types';

export default function AssetDashboard() {
  // 1. 初始化表单，加入 Price 字段并设置默认值
  const [formData, setFormData] = useState<any>({
    name: '',
    type: 'Hardware',
    serial: '',
    location: '',
    price: '',              // 初始为空字符串，方便用户填写
    status: 'available',    
    condition: 'good',      
    qr_code: '',            
  });

  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    
    try {
      // 2. 数据校准：强行转换数据类型，确保数据库不报错
      const payload: CreateAssetPayload = {
        ...formData,
        // 关键点：将字符串 "6000" 转换为纯数字 6000
        price: parseFloat(String(formData.price).replace(/[^0-9.]/g, '')) || 0,
        // 自动补全二维码
        qr_code: formData.qr_code || `QR-${Date.now()}` 
      };

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage("✅ 成功！数据已存入 Supabase 数据库");
        // 保存成功后重置表单
        setFormData({ name: '', type: 'Hardware', serial: '', location: '', price: '', status: 'available', condition: 'good', qr_code: '' });
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
        <h1 className="text-2xl font-bold mb-8 text-center text-blue-600">资产管理 (全栈联调版)</h1>
        
        <div className="space-y-5">
          {/* 资产名称 */}
          <div>
            <label className="block text-sm font-semibold mb-2">资产名称 *</label>
            <input 
              className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="请输入资产名称 (如: MacBook Pro)"

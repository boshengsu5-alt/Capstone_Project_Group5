"use client";

import { useState } from "react";

export default function AssetDashboard() {
  // 1. 初始化表单：增加 category_id 兼容组长可能的必填项
  const [formData, setFormData] = useState({
    name: '',
    type: 'Hardware',
    serial: '',
    location: '',
    price: '',              
    status: 'available',    
    condition: 'good',      
    qr_code: '',
    category_id: '', // 新增字段
  });

  const [message, setMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState(""); // 专门存具体的报错原因
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    setErrorDetails("");
    
    try {
      // 2. 构造“多保险”Payload：同时发送多种可能的字段名
      const cleanPrice = parseFloat(String(formData.price).replace(/[^0-9.]/g, '')) || 0;
      
      const payload = {
        ...formData,
        // 双重字段备份，确保后端不管是选哪个名都能接到
        purchase_price: cleanPrice, 
        price: cleanPrice,
        serial_number: formData.serial,
        serial: formData.serial,
        qr_code: formData.qr_code || `QR-${Date.now()}`,
        // 确保 category_id 是数字或 null
        category_id: formData.category_id ? parseInt(formData.category_id) : null 
      };

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("✅ 成功！数据已入库，你可以去 Supabase 查看了");
        setFormData({ name: '', type: 'Hardware', serial: '', location: '', price: '', status: 'available', condition: 'good', qr_code: '', category_id: '' });
      } else {
        // 3. 把后端的“真心话”打印出来
        setMessage(`❌ 失败: ${result.error || "字段约束不匹配"}`);
        if (result.details) setErrorDetails(result.details);
      }
    } catch (error: any) {
      setMessage("❌ 网络错误: 请确认本地服务器正在运行 (npm run dev)");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 bg-zinc-50 min-h-screen dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="max-w-xl mx-auto bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-2 text-center text-blue-600">资产管理 (Letao 独立版)</h1>
        <p className="text-center text-zinc-400 text-sm mb-8">自动侦测字段名 & 格式强校验</p>
        
        <div className="space-y-5">
          {/* 资产名称 */}
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
            {/* 价格 */}
            <div>
              <label className="block text-sm font-semibold mb-2">价值 (Price)</label>
              <input 
                className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="数字，如 6000"
              />
            </div>
            {/* 分类 ID */}
            <div>
              <label className="block text-sm font-semibold mb-2">分类 ID (可选)</label>
              <input 
                className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.category_id}
                onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                placeholder="数字 ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">序列号 (Serial)</label>
            <input 
              className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
              value={formData.serial}
              onChange={(e) => setFormData({...formData, serial: e.target.value})}
              placeholder="序列号或编号"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">状态</label>
              <select 
                className="w-full p-3 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
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
                onChange={(e) => setFormData({...formData, condition: e.target.value})}
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
            {isSaving ? "正在拼命入库..." : "立即保存"}
          </button>

          {message && (
            <div className={`p-4 rounded-xl text-center font-bold ${
              message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div>{message}</div>
              {errorDetails && <div className="text-xs font-normal mt-2 opacity-80 underline">原因: {errorDetails}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

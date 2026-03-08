"use client";

import { Users as UsersIcon } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <UsersIcon className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理 (Users)</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-20 text-center">
        <p className="text-zinc-500">用户列表模块正在开发中...</p>
        <p className="text-xs text-zinc-400 mt-2">Day 3 任务预留位置</p>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-rose-50 dark:bg-rose-500/5 p-4 rounded-full mb-6">
        <ShieldAlert className="w-16 h-16 text-rose-500" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center">
        Access Denied / 访问受限
      </h1>
      
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-10 leading-relaxed">
        You do not have the required permissions to view this page. This section is reserved for system administrators only.
        <br />
        您没有访问此页面的权限。此区域仅限系统管理员访问。
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
      
      <div className="mt-16 text-gray-400 dark:text-gray-600 text-xs flex items-center gap-2">
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-800"></div>
        UniGear Security System
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-800"></div>
      </div>
    </div>
  );
}

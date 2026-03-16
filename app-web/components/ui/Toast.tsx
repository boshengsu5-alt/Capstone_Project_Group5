'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-rose-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  };

  const styles = {
    success: "border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-500/5",
    error: "border-rose-500/20 bg-rose-50/10 dark:bg-rose-500/5",
    warning: "border-amber-500/20 bg-amber-50/10 dark:bg-amber-500/5",
    info: "border-blue-500/20 bg-blue-50/10 dark:bg-blue-500/5",
  };

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300",
      styles[type]
    )}>
      {icons[type]}
      <p className="text-sm font-medium text-gray-900 dark:text-white min-w-[200px]">
        {message}
      </p>
      <button 
        onClick={onClose}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

'use client';

import React, { useState } from 'react';
import { X, Shield, GraduationCap, Star, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Profile, UserRole } from '@/types/database';

interface UserEditModalProps {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export default function UserEditModal({ user, isOpen, onClose, onSuccess }: UserEditModalProps) {
  const { showToast } = useToast();
  const [role, setRole] = useState<UserRole>(user.role);
  const [creditScore, setCreditScore] = useState<number>(user.credit_score);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          role,
          credit_score: creditScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      showToast('User profile updated successfully!', 'success');
      // Wait for the parent to refresh the data before we close the modal
      await onSuccess();
      onClose(); // Explicitly close the modal after success
    } catch (err: any) {
      console.error('Update error:', err);
      showToast(err.message || 'Failed to update user profile', 'error');
      setIsSubmitting(false); // Only reset on error if we want to keep it loading on success
    }
    // Note: We don't setIsSubmitting(false) in the finally block if we are closing the modal
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User Profile</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              User Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['student', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                    role === r
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-600/50"
                  )}
                >
                  {r === 'admin' ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                  <span className="capitalize">{r}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Credit Score */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Credit Score
              </label>
              <div className={cn(
                "px-2.5 py-1 rounded-lg text-sm font-bold",
                creditScore < 60 
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" 
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              )}>
                {creditScore} / 200
              </div>
            </div>
            
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={creditScore}
              onChange={(e) => setCreditScore(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            
            {creditScore < 60 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 animate-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Critical Score: User may be restricted from borrowing.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

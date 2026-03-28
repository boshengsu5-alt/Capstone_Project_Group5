'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Loader2, ShieldAlert, Star, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { getCreditReasonLabel, getUserCreditLogs } from '@/lib/userService';
import type { CreditScoreLog, Profile } from '@/types/database';

interface UserCreditHistoryModalProps {
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
}

type FilterMode = 'all' | 'bonus' | 'penalty';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getScoreTone(score: number) {
  if (score >= 150) return 'text-emerald-300';
  if (score >= 100) return 'text-blue-300';
  if (score >= 50) return 'text-amber-300';
  return 'text-rose-300';
}

export default function UserCreditHistoryModal({ user, isOpen, onClose }: UserCreditHistoryModalProps) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<CreditScoreLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    let ignore = false;
    const currentUser = user;

    async function loadLogs() {
      setIsLoading(true);
      try {
        const data = await getUserCreditLogs(currentUser.id);
        if (!ignore) {
          setLogs(data);
        }
      } catch (error) {
        console.error('Failed to load credit logs:', error);
        if (!ignore) {
          showToast('Failed to load credit history.', 'error');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLogs();

    return () => {
      ignore = true;
    };
  }, [isOpen, showToast, user]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const filteredLogs = useMemo(() => {
    if (filter === 'bonus') {
      return logs.filter((log) => log.delta > 0);
    }

    if (filter === 'penalty') {
      return logs.filter((log) => log.delta < 0);
    }

    return logs;
  }, [filter, logs]);

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />

      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#091122] shadow-[0_30px_80px_rgba(2,8,23,0.72)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.35),transparent_35%),linear-gradient(135deg,rgba(79,70,229,0.18),rgba(15,23,42,0.6))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
                <History className="h-3.5 w-3.5" />
                Credit history
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{user.full_name || 'Unnamed User'}</h2>
              <p className="mt-1 text-sm text-slate-300">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
            <div className="rounded-3xl border border-white/10 bg-black/15 px-5 py-4 text-center shadow-lg">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Current score</p>
              <div className={cn('mt-2 text-5xl font-bold tracking-tight', getScoreTone(user.credit_score))}>
                {user.credit_score}
              </div>
              <p className="mt-1 text-xs text-slate-400">Out of 200</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ['all', 'All records'],
                ['bonus', 'Bonuses only'],
                ['penalty', 'Penalties only'],
              ] as [FilterMode, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left text-sm transition',
                    filter === value
                      ? 'border-indigo-400/50 bg-indigo-500/20 text-white shadow-[0_10px_35px_rgba(99,102,241,0.24)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                  )}
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {value === 'all' ? `${logs.length} total events` : value === 'bonus' ? 'Positive score changes' : 'Negative score changes'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="mt-4 text-sm text-slate-400">Loading credit history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">No matching credit records</h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                This user does not have credit events under the current filter yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const isBonus = log.delta > 0;
                return (
                  <div
                    key={log.id}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_14px_40px_rgba(2,8,23,0.28)]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div
                          className={cn(
                            'mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl',
                            isBonus ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                          )}
                        >
                          {isBonus ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{getCreditReasonLabel(log.reason)}</h3>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                                isBonus ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20' : 'bg-rose-500/10 text-rose-300 ring-rose-400/20'
                              )}
                            >
                              {isBonus ? 'Bonus' : 'Penalty'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{formatDateTime(log.created_at)}</p>
                          {log.booking_id && (
                            <p className="mt-2 text-xs text-slate-500">
                              Related booking: <span className="font-mono text-slate-300">{log.booking_id.slice(0, 8)}...</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-right">
                        <p className={cn('text-2xl font-bold', isBonus ? 'text-emerald-300' : 'text-rose-300')}>
                          {isBonus ? '+' : ''}
                          {log.delta}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Balance after: {log.balance_after}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

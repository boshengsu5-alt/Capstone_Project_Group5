'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, RefreshCw, Search } from 'lucide-react';
import CompensationTable from '@/components/compensation/CompensationTable';
import { compensationService, type CompensationCaseWithDetails, type UpdateCompensationCaseInput } from '@/lib/compensationService';
import { getOutstandingAmount } from '@/lib/compensation';
import { useToast } from '@/components/ui/Toast';

type CompensationCategory = 'all' | 'open' | 'outstanding' | 'paid';

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNumber(value: number): string {
  return value.toFixed(2).replace(/[^\d.]/g, '');
}

export default function CompensationPage() {
  const { showToast } = useToast();
  const [cases, setCases] = useState<CompensationCaseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CompensationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await compensationService.getCompensationCases();
      setCases(data);
    } catch (error) {
      console.error('Failed to load compensation cases:', error);
      showToast('Failed to load compensation cases.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const totals = useMemo(() => {
    return cases.reduce((summary, item) => {
      const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);
      return {
        totalCases: summary.totalCases + 1,
        openCases: summary.openCases + (item.status !== 'paid' && item.status !== 'waived' ? 1 : 0),
        totalOutstanding: summary.totalOutstanding + outstanding,
        totalPaid: summary.totalPaid + item.paid_amount,
      };
    }, {
      totalCases: 0,
      openCases: 0,
      totalOutstanding: 0,
      totalPaid: 0,
    });
  }, [cases]);

  const filteredCases = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);
    const normalizedNumericQuery = normalizedQuery.replace(/[^\d.]/g, '');

    return cases.filter((item) => {
      const outstanding = getOutstandingAmount(item.agreed_amount, item.assessed_amount, item.paid_amount);

      const matchesCategory = (() => {
        switch (activeCategory) {
          case 'open':
            return item.status !== 'paid' && item.status !== 'waived';
          case 'outstanding':
            return outstanding > 0;
          case 'paid':
            return item.paid_amount > 0 || item.status === 'paid';
          case 'all':
          default:
            return true;
        }
      })();

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const textHaystack = normalizeText([
        item.assets?.name ?? '',
        item.profiles?.full_name ?? '',
        item.profiles?.student_id ?? '',
        item.payment_reference ?? '',
      ].join(' '));

      if (textHaystack.includes(normalizedQuery)) {
        return true;
      }

      if (!normalizedNumericQuery) {
        return false;
      }

      const numericValues = [
        item.assessed_amount,
        item.agreed_amount,
        item.paid_amount,
        outstanding,
      ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

      return numericValues.some((value) => {
        const variants = [
          normalizeNumber(value),
          value.toLocaleString('en-US'),
          value.toLocaleString('zh-CN'),
          Math.round(value).toString(),
        ].map((variant) => variant.replace(/[^\d.]/g, ''));

        return variants.some((variant) => variant.includes(normalizedNumericQuery));
      });
    });
  }, [activeCategory, cases, searchQuery]);

  const activeCategoryLabel = useMemo(() => {
    switch (activeCategory) {
      case 'open':
        return 'Open Cases';
      case 'outstanding':
        return 'Outstanding';
      case 'paid':
        return 'Recorded Paid';
      case 'all':
      default:
        return 'Total Cases';
    }
  }, [activeCategory]);

  const handleUpdateCase = async (input: UpdateCompensationCaseInput) => {
    const success = await compensationService.updateCompensationCase(input);
    if (!success) {
      showToast('Failed to update compensation case.', 'error');
      return;
    }

    showToast('Compensation case updated.', 'success');
    await loadCases();
  };

  const summaryCards: Array<{
    key: CompensationCategory;
    title: string;
    value: string | number;
    hint: string;
    baseClassName: string;
    activeClassName: string;
  }> = [
    {
      key: 'all',
      title: 'Total Cases',
      value: totals.totalCases,
      hint: 'View every compensation case',
      baseClassName: 'border-white/5 bg-white/[0.03]',
      activeClassName: 'border-violet-400/40 bg-violet-500/12 shadow-[0_0_0_1px_rgba(167,139,250,0.2)]',
    },
    {
      key: 'open',
      title: 'Open Cases',
      value: totals.openCases,
      hint: 'Cases still in progress',
      baseClassName: 'border-sky-500/15 bg-sky-500/5',
      activeClassName: 'border-sky-400/40 bg-sky-500/12 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]',
    },
    {
      key: 'outstanding',
      title: 'Outstanding',
      value: `¥${totals.totalOutstanding.toLocaleString()}`,
      hint: 'Cases with unpaid balance',
      baseClassName: 'border-rose-500/15 bg-rose-500/5',
      activeClassName: 'border-rose-400/40 bg-rose-500/12 shadow-[0_0_0_1px_rgba(251,113,133,0.18)]',
    },
    {
      key: 'paid',
      title: 'Recorded Paid',
      value: `¥${totals.totalPaid.toLocaleString()}`,
      hint: 'Cases with payment records',
      baseClassName: 'border-emerald-500/15 bg-emerald-500/5',
      activeClassName: 'border-emerald-400/40 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]',
    },
  ];

  const emptyState = searchQuery
    ? {
        title: 'No matching compensation cases',
        message: `No results were found for "${searchQuery}" in ${activeCategoryLabel}. Try another student, asset, or amount keyword.`,
      }
    : {
        title: `No cases in ${activeCategoryLabel}`,
        message: 'Try another category, or refresh after new compensation cases are created from damage reports.',
      };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#050505] text-gray-100">
      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-8 p-6 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/10 p-3">
                <BadgeDollarSign className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Compensation Center</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Claims, Payments, and Settlement Status</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-gray-400">
              Manage all student compensation cases created from damage reports. Track the assessed amount, the signed amount,
              payment progress, and the exact handoff instructions the student sees on mobile.
            </p>
          </div>

          <button
            onClick={() => void loadCases()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {summaryCards.map((card) => {
            const isActive = activeCategory === card.key;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveCategory(card.key)}
                className={[
                  'rounded-3xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06]',
                  card.baseClassName,
                  isActive ? card.activeClassName : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-gray-500">{card.title}</p>
                    <p className="mt-3 text-4xl font-bold text-white">{card.value}</p>
                  </div>
                  {isActive ? (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-200">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-gray-500">{card.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by student name, asset name, or amount"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-violet-400 focus:bg-white/[0.06]"
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 font-medium text-gray-300">
              {activeCategoryLabel}
            </span>
            <span>{filteredCases.length} result(s)</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.03]">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-sm font-medium text-gray-400">Loading compensation cases...</p>
          </div>
        ) : (
          <CompensationTable
            cases={filteredCases}
            onUpdateCase={handleUpdateCase}
            emptyTitle={emptyState.title}
            emptyMessage={emptyState.message}
          />
        )}
      </main>
    </div>
  );
}

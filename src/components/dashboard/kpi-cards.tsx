'use client';

import { cn } from '@/lib/utils';
import type { InventoryResult } from '@/lib/calc-engine/types';

interface KpiCardsProps {
  result: InventoryResult;
}

function formatNumber(value: number, decimals = 2): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(decimals);
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'Excellent': return 'bg-emerald-100 text-emerald-800';
    case 'Good': return 'bg-emerald-50 text-emerald-700';
    case 'Fair': return 'bg-amber-100 text-amber-800';
    case 'Needs Improvement': return 'bg-red-100 text-red-800';
    default: return 'bg-zinc-100 text-zinc-700';
  }
}

export default function KpiCards({ result }: KpiCardsProps) {
  const { grandTotal, scope1, scope2Location, scope3, dataQuality, intensityMetrics } = result;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Grand Total */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Grand Total
        </p>
        <p className="mt-2 text-3xl font-bold text-zinc-900">
          {formatNumber(grandTotal)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">tCO2e</p>
      </div>

      {/* Scope Breakdown */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Scope Breakdown
        </p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700" />
              Scope 1
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              {formatNumber(scope1.total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
              Scope 2
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              {formatNumber(scope2Location.total)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
              Scope 3
            </span>
            <span className="text-sm font-semibold text-zinc-900">
              {formatNumber(scope3.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Data Quality */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Data Quality
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={cn('rounded-md px-2.5 py-1 text-sm font-semibold', gradeColor(dataQuality.grade))}>
            {dataQuality.grade}
          </span>
          <span className="text-2xl font-bold text-zinc-900">
            {dataQuality.overall}
          </span>
          <span className="text-xs text-zinc-400">/100</span>
        </div>
        <div className="mt-2 flex gap-3 text-[11px] text-zinc-400">
          <span>{dataQuality.breakdown.primary}P</span>
          <span>{dataQuality.breakdown.secondary}S</span>
          <span>{dataQuality.breakdown.estimated}E</span>
        </div>
      </div>

      {/* Emission Intensity */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Emission Intensity
        </p>
        {intensityMetrics.perProduct != null ? (
          <>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {intensityMetrics.perProduct.toFixed(4)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">tCO2e / tonne of product</p>
          </>
        ) : intensityMetrics.perTurnover != null ? (
          <>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {intensityMetrics.perTurnover.toFixed(6)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">tCO2e / lakh INR turnover</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            No production or turnover data provided
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { CrossCheckWarning } from '@/lib/calc-engine/types';

interface CrossCheckWarningsProps {
  warnings: CrossCheckWarning[];
}

function severityStyles(severity: string) {
  switch (severity) {
    case 'error': return 'bg-red-50 text-red-700 border-red-200';
    case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
    default: return 'bg-zinc-50 text-zinc-600 border-zinc-200';
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'error': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-amber-100 text-amber-800';
    case 'info': return 'bg-blue-100 text-blue-800';
    default: return 'bg-zinc-100 text-zinc-700';
  }
}

export default function CrossCheckWarnings({ warnings }: CrossCheckWarningsProps) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Cross-Check Warnings</h3>
        <p className="mt-4 text-center text-sm text-emerald-600">
          No warnings - all cross-checks passed
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Cross-Check Warnings</h3>
      <p className="text-[11px] text-zinc-500">{warnings.length} issue{warnings.length !== 1 ? 's' : ''} detected</p>
      <div className="mt-3 space-y-2">
        {warnings.map((w, i) => (
          <div
            key={`${w.category}-${i}`}
            className={cn('rounded-lg border p-3', severityStyles(w.severity))}
          >
            <div className="flex items-center gap-2">
              <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', severityBadge(w.severity))}>
                {w.severity}
              </span>
              <span className="text-xs font-medium">{w.category}</span>
            </div>
            <p className="mt-1 text-sm">{w.message}</p>
            {w.expectedRange && w.actualValue != null && (
              <p className="mt-1 text-[11px] opacity-75">
                Expected: {w.expectedRange.min}–{w.expectedRange.max} {w.expectedRange.unit} | Actual: {w.actualValue}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

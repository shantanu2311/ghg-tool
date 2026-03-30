'use client';

import type { CombinedImpact } from '@/lib/rec-engine/types';

interface Props {
  impact: CombinedImpact;
  enabledCount: number;
}

function formatNum(n: number, decimals = 1): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

export function ImpactSummary({ impact, enabledCount }: Props) {
  const cards = [
    {
      label: 'CO2 Reduction',
      value: `${formatNum(impact.totalReductionTonnes)} tCO2e`,
      sub: `${impact.totalReductionPct.toFixed(1)}% of baseline`,
      color: impact.totalReductionTonnes > 0 ? 'text-emerald-600' : 'text-zinc-400',
    },
    {
      label: 'Baseline Emissions',
      value: `${formatNum(impact.baselineTotalTonnes)} tCO2e`,
      sub: `After: ${formatNum(impact.postReductionTotalTonnes)} tCO2e`,
      color: 'text-zinc-900',
    },
    {
      label: 'Total CAPEX',
      value: `₹${formatNum(impact.totalCapexMinLakhs)}–${formatNum(impact.totalCapexMaxLakhs)}L`,
      sub: enabledCount > 0 ? `${enabledCount} technologies` : 'None selected',
      color: 'text-zinc-900',
    },
    {
      label: 'Annual Savings',
      value: impact.totalAnnualSavingMaxInr > 0
        ? `₹${formatNum(impact.totalAnnualSavingMinInr)}–${formatNum(impact.totalAnnualSavingMaxInr)}`
        : '–',
      sub: impact.blendedPaybackYears
        ? `Blended payback: ${impact.blendedPaybackYears.toFixed(1)} yrs`
        : 'No cost data',
      color: impact.totalAnnualSavingMaxInr > 0 ? 'text-teal-600' : 'text-zinc-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] text-zinc-500">{card.label}</p>
          <p className={`mt-1 text-lg font-bold ${card.color}`}>{card.value}</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

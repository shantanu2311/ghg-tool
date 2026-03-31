'use client';

import type { CombinedImpact } from '@/lib/rec-engine/types';
import { Card, CardContent } from '@/components/ui/card';
import { Leaf, Activity, Banknote, PiggyBank } from 'lucide-react';

interface Props {
  impact: CombinedImpact;
  enabledCount: number;
}

function formatNum(n: number, decimals = 1): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

const ICONS = [Leaf, Activity, Banknote, PiggyBank];

export function ImpactSummary({ impact, enabledCount }: Props) {
  const cards = [
    {
      label: 'CO2 Reduction',
      value: `${formatNum(impact.totalReductionTonnes)} tCO2e`,
      sub: `${impact.totalReductionPct.toFixed(1)}% of baseline`,
      accent: impact.totalReductionTonnes > 0,
    },
    {
      label: 'Baseline Emissions',
      value: `${formatNum(impact.baselineTotalTonnes)} tCO2e`,
      sub: `After: ${formatNum(impact.postReductionTotalTonnes)} tCO2e`,
      accent: false,
    },
    {
      label: 'Total CAPEX',
      value: `Rs.${formatNum(impact.totalCapexMinLakhs)}--${formatNum(impact.totalCapexMaxLakhs)}L`,
      sub: enabledCount > 0
        ? `${enabledCount} ${enabledCount === 1 ? 'technology' : 'technologies'}`
        : impact.totalCapexMinLakhs > 0 ? 'All matched' : 'None selected',
      accent: false,
    },
    {
      label: 'Annual Savings',
      value: impact.totalAnnualSavingMaxInr > 0
        ? `Rs.${formatNum(impact.totalAnnualSavingMinInr)}--${formatNum(impact.totalAnnualSavingMaxInr)}`
        : '--',
      sub: impact.blendedPaybackYears
        ? impact.blendedPaybackYears >= 50
          ? 'Blended payback: >50 yrs'
          : `Blended payback: ${impact.blendedPaybackYears.toFixed(1)} yrs`
        : 'No cost data',
      accent: impact.totalAnnualSavingMaxInr > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = ICONS[i];
        return (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{card.label}</p>
              </div>
              <p className={`text-lg font-semibold ${card.accent ? 'text-primary' : ''}`}>{card.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

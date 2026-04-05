'use client';

import { cn } from '@/lib/utils';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Layers, ShieldCheck, TrendingDown } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

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
    case 'Excellent': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'Good': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
    case 'Fair': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'Needs Improvement': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function KpiCards({ result }: KpiCardsProps) {
  const { grandTotal, scope1, scope2Location, scope3, dataQuality, intensityMetrics } = result;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Grand Total */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wide">Grand Total</p>
            <InfoTip text="Total greenhouse gas emissions across all three scopes, measured in tonnes of CO2 equivalent (tCO2e)." />
          </div>
          <p className="text-3xl font-semibold font-mono tabular-nums">{formatNumber(grandTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">tCO2e</p>
        </CardContent>
      </Card>

      {/* Scope Breakdown */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Layers className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wide">Scope Breakdown</p>
            <InfoTip text="Scope 1 = direct emissions you own. Scope 2 = purchased electricity. Scope 3 = value chain (materials, transport, waste)." />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700" />
                Scope 1
              </span>
              <span className="text-sm font-semibold font-mono tabular-nums">{formatNumber(scope1.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                Scope 2
              </span>
              <span className="text-sm font-semibold font-mono tabular-nums">{formatNumber(scope2Location.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
                Scope 3
              </span>
              {scope3.total > 0 ? (
                <span className="text-sm font-semibold font-mono tabular-nums">{formatNumber(scope3.total)}</span>
              ) : (
                <span className="text-xs text-muted-foreground/70 italic">Not reported</span>
              )}
            </div>
          </div>
          {scope3.total === 0 && (
            <p className="mt-2.5 text-[11px] leading-tight text-amber-600 dark:text-amber-400">
              Actual emissions will be higher once Scope 3 data (purchased goods, transport, waste) is added.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Data Quality */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wide">Data Quality</p>
            <InfoTip text="Based on the ratio of Primary (metered), Secondary (invoiced), and Estimated data. Higher primary % = more reliable results." />
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs', gradeColor(dataQuality.grade))}>
              {dataQuality.grade}
            </Badge>
            <span className="text-2xl font-semibold font-mono tabular-nums">{dataQuality.overall}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
            <span>{dataQuality.breakdown.primary}P</span>
            <span>{dataQuality.breakdown.secondary}S</span>
            <span>{dataQuality.breakdown.estimated}E</span>
          </div>
        </CardContent>
      </Card>

      {/* Emission Intensity */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wide">Emission Intensity</p>
            <InfoTip text="Emissions per unit of output. Used for benchmarking against sector averages and BRSR reporting." />
          </div>
          {intensityMetrics.perProduct != null ? (
            <>
              <p className="text-3xl font-semibold font-mono tabular-nums">{intensityMetrics.perProduct.toFixed(4)}</p>
              <p className="mt-1 text-xs text-muted-foreground">tCO2e / tonne of product</p>
            </>
          ) : intensityMetrics.perTurnover != null ? (
            <>
              <p className="text-3xl font-semibold font-mono tabular-nums">{intensityMetrics.perTurnover.toFixed(6)}</p>
              <p className="mt-1 text-xs text-muted-foreground">tCO2e / lakh INR turnover</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No production or turnover data provided
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

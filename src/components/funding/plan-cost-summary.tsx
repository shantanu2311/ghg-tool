'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { chartTheme } from '@/lib/hooks/use-chart-theme';
import type { TechWithFunding, FundingMatch } from '@/lib/rec-engine/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CostCalcResult {
  technology: string;
  scheme: string;
  grossCostLakhs: number;
  subsidyType: 'interest_subvention' | 'capital_subsidy';
  subsidyPct: number;
  subsidyAmountLakhs: number;
  netCostLakhs: number;
  loanAmountLakhs: number;
  equityLakhs: number;
  effectiveInterestPct: number;
  tenureMonths: number;
  monthlyEmiLakhs: number;
}

interface TechCostRow {
  name: string;
  techId: string;
  schemeName: string;
  subsidy: number;
  loan: number;
  equity: number;
  gross: number;
  effectiveInterestPct: number;
  monthlyEmiLakhs: number;
  subsidyType: string;
  subsidyPct: number;
}

interface PlanCostSummaryProps {
  techs: TechWithFunding[];
  pickBestScheme: (tech: TechWithFunding) => FundingMatch | null;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

function fmtLakhs(v: number): string {
  if (v === 0) return '₹0';
  if (v >= 100) return `₹${(v / 100).toFixed(1)} Cr`;
  return `₹${v.toFixed(1)}L`;
}

/** Truncate long tech names for chart axis */
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */

const COLORS = {
  subsidy: 'var(--color-primary, #10b981)',
  loan: 'var(--chart-scope2, #f59e0b)',
  equity: 'var(--chart-scope1, #1e293b)',
};

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function SummaryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload: TechCostRow }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div style={chartTheme.tooltipStyle}>
      <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>
        {row.name}
      </p>
      <p className="text-[10px] text-muted-foreground mb-2">via {row.schemeName}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Project Cost</span>
          <span className="font-medium">{fmtLakhs(row.gross)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: COLORS.subsidy }}>
            {row.subsidyType === 'capital_subsidy' ? 'Subsidy' : 'Interest Saving'} ({row.subsidyPct}%)
          </span>
          <span className="font-medium" style={{ color: COLORS.subsidy }}>-{fmtLakhs(row.subsidy)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: COLORS.loan }}>Bank Loan</span>
          <span className="font-medium">{fmtLakhs(row.loan)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: COLORS.equity }}>Your Equity</span>
          <span className="font-medium">{fmtLakhs(row.equity)}</span>
        </div>
        <div className="border-t border-border pt-1 mt-1 flex justify-between gap-4">
          <span className="text-muted-foreground">EMI</span>
          <span className="font-medium">{fmtLakhs(row.monthlyEmiLakhs)}/mo @ {row.effectiveInterestPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PlanCostSummary({ techs, pickBestScheme, className }: PlanCostSummaryProps) {
  const [results, setResults] = useState<Map<string, CostCalcResult>>(new Map());
  const [loading, setLoading] = useState(false);

  // Build tech-scheme pairs
  const pairs = useMemo(() => {
    const out: Array<{ tech: TechWithFunding; scheme: FundingMatch }> = [];
    for (const tech of techs) {
      const best = pickBestScheme(tech);
      if (best) out.push({ tech, scheme: best });
    }
    return out;
  }, [techs, pickBestScheme]);

  // Fetch all cost calculations in parallel
  useEffect(() => {
    if (pairs.length === 0) return;
    let cancelled = false;

    Promise.all(
      pairs.map(({ tech, scheme }) =>
        fetch('/api/cost-calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ techId: tech.techId, schemeId: scheme.schemeId }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => [tech.techId, data] as [string, CostCalcResult | null])
          .catch(() => [tech.techId, null] as [string, null])
      )
    ).then((entries) => {
      if (cancelled) return;
      const map = new Map<string, CostCalcResult>();
      for (const [id, data] of entries) {
        if (data) map.set(id, data);
      }
      setResults(map);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [pairs]);

  // Build chart data
  const chartData = useMemo<TechCostRow[]>(() => {
    return pairs
      .filter(({ tech }) => results.has(tech.techId))
      .map(({ tech, scheme }) => {
        const r = results.get(tech.techId)!;
        return {
          name: truncate(tech.name, 22),
          techId: tech.techId,
          schemeName: scheme.name,
          subsidy: r.subsidyAmountLakhs,
          loan: r.loanAmountLakhs,
          equity: r.equityLakhs,
          gross: r.grossCostLakhs,
          effectiveInterestPct: r.effectiveInterestPct,
          monthlyEmiLakhs: r.monthlyEmiLakhs,
          subsidyType: r.subsidyType,
          subsidyPct: r.subsidyPct,
        };
      });
  }, [pairs, results]);

  // Totals
  const totals = useMemo(() => {
    let gross = 0, subsidy = 0, loan = 0, equity = 0, emi = 0;
    for (const row of chartData) {
      gross += row.gross;
      subsidy += row.subsidy;
      loan += row.loan;
      equity += row.equity;
      emi += row.monthlyEmiLakhs;
    }
    return { gross, subsidy, loan, equity, emi };
  }, [chartData]);

  if (pairs.length === 0) return null;

  const chartHeight = Math.max(180, pairs.length * 52 + 40);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">
            Cost Breakdown
            <InfoTip text="Shows project cost, subsidy/interest savings, bank loan, and your equity for each enabled technology with its best matching scheme." />
          </CardTitle>
        </div>
        <CardDescription className="text-[11px]">
          {chartData.length} {chartData.length === 1 ? 'technology' : 'technologies'} with funding — auto-matched to best scheme
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[200px] w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No cost data available</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.gridStroke}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={chartTheme.xAxisTick}
                  tickFormatter={(v: number) => fmtLakhs(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ ...chartTheme.yAxisTick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                />
                <Tooltip content={<SummaryTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="square"
                  iconSize={10}
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>{value}</span>
                  )}
                />
                <Bar dataKey="equity" name="Your Equity" stackId="cost" fill={COLORS.equity} radius={[0, 0, 0, 0]} />
                <Bar dataKey="loan" name="Bank Loan" stackId="cost" fill={COLORS.loan} />
                <Bar dataKey="subsidy" name="Savings" stackId="cost" fill={COLORS.subsidy} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary totals */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Project Cost</p>
                <p className="text-xs font-semibold">{fmtLakhs(totals.gross)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Savings</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  -{fmtLakhs(totals.subsidy)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Bank Loan</p>
                <p className="text-xs font-semibold">{fmtLakhs(totals.loan)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Your Equity</p>
                <p className="text-xs font-semibold">{fmtLakhs(totals.equity)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Combined EMI</p>
                <p className="text-xs font-semibold">{fmtLakhs(totals.emi)}/mo</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

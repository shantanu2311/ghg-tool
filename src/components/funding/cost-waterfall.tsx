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
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

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

interface WaterfallRow {
  name: string;
  invisible: number;
  value: number;
  type: 'gross' | 'subsidy' | 'net' | 'loan' | 'equity';
}

interface TechOption {
  techId: string;
  name: string;
}

interface SchemeOption {
  schemeId: string;
  name: string;
}

interface CostWaterfallProps {
  technologies: TechOption[];
  schemes: SchemeOption[];
  defaultTechId?: string;
  defaultSchemeId?: string;
  className?: string;
  /** Hide tech/scheme selectors — auto-uses defaultTechId + defaultSchemeId */
  hideSelectors?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Formatting                                                         */
/* ------------------------------------------------------------------ */

function fmtLakhs(v: number): string {
  if (v === 0) return '₹0';
  if (v >= 100) return `₹${(v / 100).toFixed(1)} Cr`;
  return `₹${v.toFixed(1)}L`;
}

/* ------------------------------------------------------------------ */
/*  Bar colors                                                         */
/* ------------------------------------------------------------------ */

const BAR_COLORS: Record<WaterfallRow['type'], string> = {
  gross: 'var(--chart-baseline, #94a3b8)',
  subsidy: 'var(--color-primary, #10b981)',
  net: 'var(--chart-after, #3b82f6)',
  loan: 'var(--chart-scope2, #f59e0b)',
  equity: 'var(--chart-scope1, #ef4444)',
};

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WaterfallRow }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const labels: Record<string, string> = {
    gross: 'Total Project Cost',
    subsidy: 'Subsidy / Saving',
    net: 'Net Cost to You',
    loan: 'Bank Loan',
    equity: 'Your Equity',
  };

  return (
    <div style={chartTheme.tooltipStyle}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
        {labels[row.type] ?? row.name}
      </p>
      <p className="text-sm font-bold" style={{ color: BAR_COLORS[row.type] }}>
        {fmtLakhs(row.value)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CostWaterfall({
  technologies,
  schemes,
  defaultTechId,
  defaultSchemeId,
  className,
  hideSelectors,
}: CostWaterfallProps) {
  const [techId, setTechId] = useState(defaultTechId ?? technologies[0]?.techId ?? '');
  const [schemeId, setSchemeId] = useState(defaultSchemeId ?? schemes[0]?.schemeId ?? '');
  const [result, setResult] = useState<CostCalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!techId || !schemeId) return;
    setLoading(true);
    setError(null);
    fetch('/api/cost-calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ techId, schemeId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not calculate costs');
        return res.json();
      })
      .then(setResult)
      .catch((err) => {
        setError(err.message);
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [techId, schemeId]);

  // Build waterfall data
  const waterfallData = useMemo<WaterfallRow[]>(() => {
    if (!result) return [];
    return [
      { name: 'Project Cost', invisible: 0, value: result.grossCostLakhs, type: 'gross' },
      {
        name: result.subsidyType === 'capital_subsidy' ? 'Subsidy' : 'Interest Saving',
        invisible: result.grossCostLakhs - result.subsidyAmountLakhs,
        value: result.subsidyAmountLakhs,
        type: 'subsidy',
      },
      { name: 'Net Cost', invisible: 0, value: result.netCostLakhs, type: 'net' },
      { name: 'Bank Loan', invisible: result.equityLakhs, value: result.loanAmountLakhs, type: 'loan' },
      { name: 'Your Equity', invisible: 0, value: result.equityLakhs, type: 'equity' },
    ];
  }, [result]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">
            Net Cost Breakdown
            <InfoTip text="Shows how project cost reduces after subsidies/interest savings, and how the net cost splits into bank loan and your equity contribution." />
          </CardTitle>
        </div>
        <CardDescription className="text-[11px]">
          {hideSelectors
            ? `${technologies.find((t) => t.techId === techId)?.name ?? ''} + ${schemes.find((s) => s.schemeId === schemeId)?.name ?? ''}`
            : 'Select a technology and funding scheme to see the cost waterfall'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Selectors */}
        {!hideSelectors && (
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={techId} onValueChange={(val) => val && setTechId(val)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue>
                {technologies.find((t) => t.techId === techId)?.name ?? 'Select technology'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {technologies.map((t) => (
                <SelectItem key={t.techId} value={t.techId}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={schemeId} onValueChange={(val) => val && setSchemeId(val)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue>
                {schemes.find((s) => s.schemeId === schemeId)?.name ?? 'Select scheme'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {schemes.map((s) => (
                <SelectItem key={s.schemeId} value={s.schemeId}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}

        {/* Chart */}
        {loading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              This technology-scheme combination may not have linked funding data.
            </p>
          </div>
        ) : result && waterfallData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={waterfallData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ ...chartTheme.xAxisTick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartTheme.yAxisTick}
                  tickFormatter={(v: number) => fmtLakhs(v)}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<WaterfallTooltip />} cursor={false} />
                {/* Invisible spacer bar */}
                <Bar dataKey="invisible" stackId="a" fill="transparent" />
                {/* Visible value bar */}
                <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((row, i) => (
                    <Cell key={i} fill={BAR_COLORS[row.type]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => fmtLakhs(Number(v))}
                    style={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-foreground)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground">Subsidy Type</p>
                <p className="text-xs font-semibold capitalize">
                  {result.subsidyType.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">You Save</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmtLakhs(result.subsidyAmountLakhs)} ({result.subsidyPct}%)
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Effective Interest</p>
                <p className="text-xs font-semibold">
                  {result.effectiveInterestPct.toFixed(1)}% p.a.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Monthly EMI</p>
                <p className="text-xs font-semibold">
                  {fmtLakhs(result.monthlyEmiLakhs)}/mo
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Select a technology and scheme above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

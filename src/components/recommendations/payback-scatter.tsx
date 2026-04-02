'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TechWithFunding } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

/** Priority tiers with distinct colors */
const TIERS = {
  quickWin: { label: 'Quick Win', color: chartTheme.tier.quickWin, bg: 'bg-emerald-500' },
  strategic: { label: 'Strategic', color: chartTheme.tier.strategic, bg: 'bg-amber-500' },
  easyWin: { label: 'Easy Win', color: chartTheme.tier.easyWin, bg: 'bg-indigo-500' },
  lowPriority: { label: 'Low Priority', color: chartTheme.tier.lowPriority, bg: 'bg-slate-400' },
} as const;

type TierKey = keyof typeof TIERS;

/**
 * Classify tech into a priority tier.
 * Quick Win: high impact (above median) + fast payback (below median)
 * Strategic: high impact + slower payback
 * Easy Win: lower impact + fast payback
 * Low Priority: lower impact + slower payback
 */
function classifyTier(
  pctOfTotal: number,
  paybackMid: number,
  medianPct: number,
  medianPayback: number,
): TierKey {
  const highImpact = pctOfTotal >= medianPct;
  const fastPayback = paybackMid <= medianPayback;
  if (highImpact && fastPayback) return 'quickWin';
  if (highImpact && !fastPayback) return 'strategic';
  if (!highImpact && fastPayback) return 'easyWin';
  return 'lowPriority';
}

function fmtCO2(v: number): string {
  if (v === 0) return '0';
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}

interface Props {
  technologies: TechWithFunding[];
  enabledTechIds: Set<string>;
}

interface BarData {
  name: string;
  fullName: string;
  pctOfTotal: number;
  paybackMid: number;
  reductionMid: number;
  capexMid: number;
  tier: TierKey;
  color: string;
}

export function PaybackScatter({ technologies, enabledTechIds }: Props) {
  const enabled = technologies.filter((t) => enabledTechIds.has(t.techId));

  if (enabled.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Priority Ranking
            <InfoTip text="Technologies ranked by priority. Quick Wins (high impact, fast payback) should be implemented first." />
          </CardTitle>
          <CardDescription className="text-[11px]">Enable technologies to see priority ranking</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Enable technologies to see the priority ranking</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate medians for tier classification
  const pcts = enabled.map((t) => t.pctOfTotal).sort((a, b) => a - b);
  const paybacks = enabled.map((t) => (t.paybackMinYears + t.paybackMaxYears) / 2).sort((a, b) => a - b);
  const medianPct = pcts[Math.floor(pcts.length / 2)];
  const medianPayback = paybacks[Math.floor(paybacks.length / 2)];

  // Build bar data
  const data: BarData[] = enabled.map((t) => {
    const paybackMid = (t.paybackMinYears + t.paybackMaxYears) / 2;
    const tier = classifyTier(t.pctOfTotal, paybackMid, medianPct, medianPayback);
    return {
      name: t.name.length > 22 ? t.name.substring(0, 20) + '…' : t.name,
      fullName: t.name,
      pctOfTotal: t.pctOfTotal,
      paybackMid,
      reductionMid: t.reductionMidTonnes,
      capexMid: ((t.capexMinLakhs ?? 0) + (t.capexMaxLakhs ?? 0)) / 2,
      tier,
      color: TIERS[tier].color,
    };
  });

  // Sort: Quick Wins first, then Strategic, Easy Wins, Low Priority
  // Within each tier, sort by pctOfTotal descending
  const tierOrder: TierKey[] = ['quickWin', 'strategic', 'easyWin', 'lowPriority'];
  data.sort((a, b) => {
    const ta = tierOrder.indexOf(a.tier);
    const tb = tierOrder.indexOf(b.tier);
    if (ta !== tb) return ta - tb;
    return b.pctOfTotal - a.pctOfTotal;
  });

  const chartHeight = Math.max(250, data.length * 34 + 40);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Priority Ranking
          <InfoTip text="Technologies ranked by priority. Quick Wins (high impact, fast payback) should be implemented first." />
        </CardTitle>
        <CardDescription className="text-[11px]">
          Sorted by priority — implement from top to bottom
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                label={{ value: '% of total emissions', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 10, fill: 'var(--color-foreground)' }}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Impact']}
                labelFormatter={(label) => String(label)}
                contentStyle={chartTheme.tooltipStyle}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0].payload as BarData;
                  return (
                    <div style={chartTheme.tooltipStyle}>
                      <p className="text-xs font-semibold mb-1">{d.fullName}</p>
                      <p className="text-[11px]" style={{ color: d.color }}>{TIERS[d.tier].label}</p>
                      <p className="text-[11px] text-muted-foreground">Impact: {d.pctOfTotal.toFixed(1)}% of total</p>
                      <p className="text-[11px] text-muted-foreground">Reduction: {fmtCO2(d.reductionMid)} tCO2e</p>
                      <p className="text-[11px] text-muted-foreground">Payback: {d.paybackMid.toFixed(1)} years</p>
                      {d.capexMid > 0 && <p className="text-[11px] text-muted-foreground">CAPEX: Rs.{d.capexMid.toFixed(0)}L</p>}
                    </div>
                  );
                }}
              />
              <Bar dataKey="pctOfTotal" isAnimationActive={false} radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tier legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-2 mt-1">
          {tierOrder.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: TIERS[key].color, opacity: 0.85 }} />
              <span className="text-[10px] text-muted-foreground">{TIERS[key].label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

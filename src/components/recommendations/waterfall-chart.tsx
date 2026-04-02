'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Customized, LabelList } from 'recharts';
import type { CombinedImpact, TechWithFunding } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { LEVER_GROUPS, TECH_TO_LEVER } from '@/lib/rec-engine/lever-groups';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

function fmtCO2(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}

/** Priority tiers — same as priority ranking but applied to waterfall bars */
const TIER_COLORS = {
  quickWin: chartTheme.tier.quickWin,
  strategic: chartTheme.tier.strategic,
  easyWin: chartTheme.tier.easyWin,
  lowPriority: chartTheme.tier.lowPriority,
} as const;

const TIER_LABELS: Record<string, string> = {
  quickWin: 'Quick Win',
  strategic: 'Strategic',
  easyWin: 'Easy Win',
  lowPriority: 'Low Priority',
};

type TierKey = keyof typeof TIER_COLORS;

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

interface WaterfallRow {
  name: string;
  fullName: string;
  invisible: number;
  value: number;
  residual: number; // Running residual after this row
  type: 'baseline' | 'reduction' | 'after';
  tier: TierKey | null;
  paybackMid: number | null;
  pctOfTotal: number | null;
  capexLabel: string | null; // e.g. "Rs.5-10L"
  paybackLabel: string | null; // e.g. "2.5yr"
  annotation: string | null; // Combined: "Rs.5-10L · 2.5yr"
}

interface Props {
  impact: CombinedImpact;
  technologies?: TechWithFunding[];
  enabledTechIds?: Set<string>;
}

export function WaterfallChart({ impact, technologies, enabledTechIds }: Props) {
  if (impact.technologySequence.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Reduction Waterfall &amp; Priority
            <InfoTip text="Shows each technology's contribution to total reduction, color-coded by priority. Implement Quick Wins (green) first." />
          </CardTitle>
          <CardDescription className="text-[11px]">Toggle technologies to see their contribution and priority</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No technologies enabled</p>
        </CardContent>
      </Card>
    );
  }

  // Build tech lookup for tier classification
  const enabled = technologies?.filter((t) => enabledTechIds?.has(t.techId)) ?? [];
  const techMap = new Map(enabled.map((t) => [t.techId, t]));

  // Compute medians for tier classification
  const pcts = enabled.map((t) => t.pctOfTotal).sort((a, b) => a - b);
  const paybacks = enabled.map((t) => (t.paybackMinYears + t.paybackMaxYears) / 2).sort((a, b) => a - b);
  const medianPct = pcts.length > 0 ? pcts[Math.floor(pcts.length / 2)] : 0;
  const medianPayback = paybacks.length > 0 ? paybacks[Math.floor(paybacks.length / 2)] : 0;

  // Lever label lookup
  const leverLabels = new Map<string, string>();
  for (const g of LEVER_GROUPS) leverLabels.set(g.lever, g.label);

  // Sort by tier order first, then by reduction amount within each tier
  const tierOrder: TierKey[] = ['quickWin', 'strategic', 'easyWin', 'lowPriority'];

  const stepsWithTier = impact.technologySequence.map((step) => {
    const tech = techMap.get(step.techId);
    const paybackMid = tech ? (tech.paybackMinYears + tech.paybackMaxYears) / 2 : 5;
    const pctOfTotal = tech?.pctOfTotal ?? 0;
    const tier = classifyTier(pctOfTotal, paybackMid, medianPct, medianPayback);
    const capexMin = tech?.capexMinLakhs ?? null;
    const capexMax = tech?.capexMaxLakhs ?? null;
    return { ...step, tier, paybackMid, pctOfTotal, capexMin, capexMax };
  });

  // Sort: Quick Wins first (top), then Strategic, Easy, Low Priority
  // Within each tier, sort by reduction descending
  stepsWithTier.sort((a, b) => {
    const ta = tierOrder.indexOf(a.tier);
    const tb = tierOrder.indexOf(b.tier);
    if (ta !== tb) return ta - tb;
    return b.reductionTonnes - a.reductionTonnes;
  });

  // Build waterfall data
  const waterfallData: WaterfallRow[] = [];

  waterfallData.push({
    name: 'Baseline',
    fullName: 'Baseline Emissions',
    invisible: 0,
    value: impact.baselineTotalTonnes,
    residual: impact.baselineTotalTonnes,
    type: 'baseline',
    tier: null,
    paybackMid: null,
    pctOfTotal: null,
    capexLabel: null,
    paybackLabel: null,
    annotation: null,
  });

  let running = impact.baselineTotalTonnes;
  for (const step of stepsWithTier) {
    const lever = TECH_TO_LEVER[step.techId];
    const displayName = lever
      ? `${leverLabels.get(lever) ?? lever} (${step.name})`
      : step.name;

    running -= step.reductionTonnes;

    // Build annotation
    const capexLabel = step.capexMin != null && step.capexMin > 0
      ? `Rs.${step.capexMin}-${step.capexMax}L`
      : null;
    const paybackLabel = step.paybackMid === 0 ? 'No cost' : `${step.paybackMid.toFixed(1)}yr`;
    const annotation = [capexLabel, paybackLabel].filter(Boolean).join(' · ');

    waterfallData.push({
      name: displayName,
      fullName: step.name,
      invisible: running,
      value: step.reductionTonnes,
      residual: running,
      type: 'reduction',
      tier: step.tier,
      paybackMid: step.paybackMid,
      pctOfTotal: step.pctOfTotal,
      capexLabel,
      paybackLabel,
      annotation: annotation || null,
    });
  }

  waterfallData.push({
    name: 'After Reduction',
    fullName: 'After Reduction',
    invisible: 0,
    value: impact.postReductionTotalTonnes,
    residual: impact.postReductionTotalTonnes,
    type: 'after',
    tier: null,
    paybackMid: null,
    pctOfTotal: null,
    capexLabel: null,
    paybackLabel: null,
    annotation: null,
  });

  const barCount = waterfallData.length;
  const chartHeight = Math.max(260, barCount * 32 + 40);

  // Color mapping
  function getBarColor(entry: WaterfallRow): string {
    if (entry.type === 'baseline') return chartTheme.beforeAfter.baseline;
    if (entry.type === 'after') return chartTheme.beforeAfter.after;
    if (entry.tier) return TIER_COLORS[entry.tier];
    return chartTheme.tier.quickWin;
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Reduction Waterfall &amp; Priority
          <InfoTip text="Shows each technology's contribution to total reduction, color-coded by priority. Implement Quick Wins (green) first." />
        </CardTitle>
        <CardDescription className="text-[11px]">
          Bars color-coded by priority — implement from top to bottom
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterfallData}
              layout="vertical"
              margin={{ top: 5, right: 90, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.08)]}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                tickFormatter={(v) => fmtCO2(Number(v))}
                label={{ value: 'tCO2e', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={220}
                tick={{ fontSize: 10, fill: 'var(--color-foreground)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload as WaterfallRow | undefined;
                  if (!d) return null;
                  // Hide tooltip for the invisible bar
                  if (d.type === 'baseline') {
                    return (
                      <div style={chartTheme.tooltipStyle}>
                        <p className="text-xs font-semibold">Baseline Emissions</p>
                        <p className="text-[11px] text-muted-foreground">{fmtCO2(d.value)} tCO2e</p>
                      </div>
                    );
                  }
                  if (d.type === 'after') {
                    return (
                      <div style={chartTheme.tooltipStyle}>
                        <p className="text-xs font-semibold">After Reduction</p>
                        <p className="text-[11px] text-muted-foreground">{fmtCO2(d.value)} tCO2e</p>
                      </div>
                    );
                  }
                  return (
                    <div style={chartTheme.tooltipStyle}>
                      <p className="text-xs font-semibold mb-1">{d.fullName}</p>
                      {d.tier && <p className="text-[11px] font-medium" style={{ color: TIER_COLORS[d.tier] }}>{TIER_LABELS[d.tier]}</p>}
                      <p className="text-[11px] text-muted-foreground">Reduction: {fmtCO2(d.value)} tCO2e</p>
                      {d.pctOfTotal != null && <p className="text-[11px] text-muted-foreground">Impact: {d.pctOfTotal.toFixed(1)}% of total</p>}
                      {d.capexLabel && <p className="text-[11px] text-muted-foreground">CAPEX: {d.capexLabel}</p>}
                      {d.paybackMid != null && <p className="text-[11px] text-muted-foreground">Payback: {d.paybackMid.toFixed(1)} years</p>}
                    </div>
                  );
                }}
              />
              <ReferenceLine x={impact.postReductionTotalTonnes} stroke="var(--color-primary)" strokeDasharray="3 3" strokeWidth={1} />
              <Bar dataKey="invisible" stackId="stack" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="stack" isAnimationActive={false} radius={[0, 4, 4, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry)} fillOpacity={entry.type === 'reduction' ? 0.85 : 1} />
                ))}
                <LabelList
                  dataKey="annotation"
                  position="right"
                  content={({ x, y, width, height, value }) => {
                    if (!value) return null;
                    const xPos = Number(x) + Number(width) + 4;
                    const yPos = Number(y) + Number(height) / 2;
                    return (
                      <text x={xPos} y={yPos} dy={4} fontSize={9} fill="var(--color-muted-foreground)" textAnchor="start">
                        {String(value)}
                      </text>
                    );
                  }}
                />
              </Bar>
              {/* Trend line connecting residual values */}
              <Customized
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={(props: any) => {
                  const xAxis = props.xAxisMap && Object.values(props.xAxisMap)[0] as { scale?: (v: number) => number } | undefined;
                  const yAxis = props.yAxisMap && Object.values(props.yAxisMap)[0] as { scale?: (v: string) => number; bandSize?: number } | undefined;
                  if (!xAxis?.scale || !yAxis?.scale) return null;
                  const points = waterfallData.map((row) => {
                    const x = xAxis.scale!(row.residual);
                    const bandSize = typeof yAxis.bandSize === 'number' ? yAxis.bandSize : 0;
                    const yVal = yAxis.scale!(row.name);
                    const y = (typeof yVal === 'number' ? yVal : 0) + bandSize / 2;
                    return { x, y };
                  });
                  if (points.length < 2) return null;
                  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  return (
                    <g>
                      <path d={pathD} fill="none" stroke="var(--chart-trend)" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
                      {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--chart-trend)" opacity={0.8} />
                      ))}
                    </g>
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 border-t border-border pt-2 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: TIER_COLORS.quickWin, opacity: 0.85 }} />
            <span className="text-[10px] text-muted-foreground font-medium">Quick Win</span>
            <InfoTip text="High impact + fast payback. Implement these first for maximum ROI." />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: TIER_COLORS.strategic, opacity: 0.85 }} />
            <span className="text-[10px] text-muted-foreground">Strategic</span>
            <InfoTip text="High impact but longer payback. Plan and budget for these as medium-term investments." />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: TIER_COLORS.easyWin, opacity: 0.85 }} />
            <span className="text-[10px] text-muted-foreground">Easy Win</span>
            <InfoTip text="Lower impact but fast payback. Low-risk improvements that pay for themselves quickly." />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: TIER_COLORS.lowPriority, opacity: 0.85 }} />
            <span className="text-[10px] text-muted-foreground">Low Priority</span>
            <InfoTip text="Lower impact and longer payback. Consider only after higher-priority measures are in place." />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: chartTheme.beforeAfter.after }} />
            <span className="text-[10px] text-muted-foreground">After</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

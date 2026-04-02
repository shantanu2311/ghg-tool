'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

const COLORS = {
  scope1: chartTheme.scope.scope1,
  scope2: chartTheme.scope.scope2,
  scope3: chartTheme.scope.scope3,
};

function fmtCO2(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}

interface Props {
  impact: CombinedImpact;
}

export function BeforeAfterChart({ impact }: Props) {
  const reductionFraction = impact.baselineTotalTonnes > 0
    ? impact.totalReductionTonnes / impact.baselineTotalTonnes
    : 0;

  const reductionPct = (reductionFraction * 100).toFixed(1);

  const data = [
    {
      name: 'Baseline',
      'Scope 1': impact.baselineScope1Tonnes,
      'Scope 2': impact.baselineScope2Tonnes,
      'Scope 3': impact.baselineScope3Tonnes,
      total: impact.baselineTotalTonnes,
      trend: impact.baselineTotalTonnes,
      label: `${fmtCO2(impact.baselineTotalTonnes)} tCO2e`,
    },
    {
      name: 'After Reduction',
      'Scope 1': impact.baselineScope1Tonnes * (1 - reductionFraction),
      'Scope 2': impact.baselineScope2Tonnes * (1 - reductionFraction),
      'Scope 3': impact.baselineScope3Tonnes * (1 - reductionFraction),
      total: impact.postReductionTotalTonnes,
      trend: impact.postReductionTotalTonnes,
      label: `${fmtCO2(impact.postReductionTotalTonnes)} tCO2e (-${reductionPct}%)`,
    },
  ];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Before vs After Emissions</CardTitle>
        <CardDescription className="text-[11px]">Stacked by scope — baseline vs post-reduction</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
              <Tooltip
                formatter={(value, name) => {
                  if (String(name) === 'trend') return [null, null];
                  return [`${Number(value).toFixed(1)} tCO2e`, String(name)];
                }}
                contentStyle={chartTheme.tooltipStyle}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px' }}
                content={({ payload }) => {
                  const items = (payload ?? []).filter((p) => p.value !== 'trend');
                  return (
                    <div className="flex justify-center gap-4 mt-1">
                      {items.map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: String(entry.color) }} />
                          <span className="text-[11px] text-muted-foreground">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="Scope 1" stackId="a" fill={COLORS.scope1} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Scope 2" stackId="a" fill={COLORS.scope2} isAnimationActive={false} />
              <Bar dataKey="Scope 3" stackId="a" fill={COLORS.scope3} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="label"
                  position="top"
                  style={{ fontSize: 11, fill: 'var(--color-muted-foreground)', fontWeight: 500 }}
                />
              </Bar>
              <Line
                dataKey="trend"
                stroke={chartTheme.beforeAfter.trend}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: chartTheme.beforeAfter.trend, stroke: chartTheme.beforeAfter.trend }}
                isAnimationActive={false}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

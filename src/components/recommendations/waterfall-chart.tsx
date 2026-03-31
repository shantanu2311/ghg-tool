'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

const tooltipStyle = {
  borderRadius: '10px',
  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
  padding: '10px 14px',
  backgroundColor: 'var(--color-card, white)',
  border: '1px solid var(--color-border)',
};

interface Props {
  impact: CombinedImpact;
}

export function WaterfallChart({ impact }: Props) {
  if (impact.technologySequence.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Reduction Waterfall</CardTitle>
          <CardDescription className="text-[11px]">Toggle technologies to see their contribution</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No technologies enabled</p>
        </CardContent>
      </Card>
    );
  }

  const waterfallData: { name: string; invisible: number; value: number; type: 'total' | 'reduction' }[] = [];

  waterfallData.push({
    name: 'Baseline',
    invisible: 0,
    value: impact.baselineTotalTonnes,
    type: 'total',
  });

  let running = impact.baselineTotalTonnes;
  for (const step of impact.technologySequence) {
    running -= step.reductionTonnes;
    waterfallData.push({
      name: step.name.length > 15 ? step.name.substring(0, 15) + '...' : step.name,
      invisible: running,
      value: step.reductionTonnes,
      type: 'reduction',
    });
  }

  waterfallData.push({
    name: 'After',
    invisible: 0,
    value: impact.postReductionTotalTonnes,
    type: 'total',
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Reduction Waterfall</CardTitle>
        <CardDescription className="text-[11px]">Each technology's contribution to total reduction</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-foreground)' }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
              <Tooltip
                formatter={(value, name) => {
                  if (String(name) === 'invisible') return ['', ''];
                  return [`${Number(value).toFixed(1)} tCO2e`, String(name) === 'value' ? 'Amount' : String(name)];
                }}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="invisible" stackId="stack" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="stack" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.type === 'total' ? (entry.name === 'Baseline' ? '#8B8B8B' : '#2D6A4F') : '#2EC4B6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

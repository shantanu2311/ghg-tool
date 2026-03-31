'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

interface TopSourcesProps {
  result: InventoryResult;
}

const tooltipStyle = {
  borderRadius: '10px',
  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
  padding: '10px 14px',
  backgroundColor: 'var(--color-card, white)',
  border: '1px solid var(--color-border)',
};

export default function TopSources({ result }: TopSourcesProps) {
  const data = result.topSources.slice(0, 5).map((s) => ({
    name: s.source.length > 25 ? s.source.slice(0, 22) + '...' : s.source,
    fullName: s.source,
    co2e: Number(s.co2e.toFixed(2)),
    percent: s.percent,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Emission Sources</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No sources available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top Emission Sources</CardTitle>
        <CardDescription className="text-[11px]">Top 5 contributors by CO2e</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11, fill: 'var(--color-foreground)' }}
              />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toFixed(2)} tCO2e`, String(name)]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="co2e" fill="#0f766e" radius={[0, 4, 4, 0]} name="CO2e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="border-t border-border pt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {result.topSources.slice(0, 5).map((s) => (
              <span key={s.source} className="text-[11px] text-muted-foreground">
                {s.source}: {s.percent.toFixed(1)}%
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

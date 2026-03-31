'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import type { TechWithFunding } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Energy Efficiency - Cross Sector': '#0f766e',
  'Sector Specific - Iron & Steel': '#2563eb',
  'Green Electricity': '#059669',
  'Alternative Fuels': '#d97706',
};

const tooltipStyle = {
  borderRadius: '10px',
  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
  padding: '10px 14px',
  backgroundColor: 'var(--color-card, white)',
  border: '1px solid var(--color-border)',
};

interface Props {
  technologies: TechWithFunding[];
  enabledTechIds: Set<string>;
}

export function PaybackScatter({ technologies, enabledTechIds }: Props) {
  const enabled = technologies.filter((t) => enabledTechIds.has(t.techId));

  if (enabled.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Payback vs Impact</CardTitle>
          <CardDescription className="text-[11px]">Bubble size = CAPEX, position = payback x CO2 reduction</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Enable technologies to see the scatter plot</p>
        </CardContent>
      </Card>
    );
  }

  const data = enabled.map((t) => ({
    x: (t.paybackMinYears + t.paybackMaxYears) / 2,
    y: t.reductionMidTonnes,
    z: ((t.capexMinLakhs ?? 0) + (t.capexMaxLakhs ?? 0)) / 2,
    name: t.name,
    category: t.category,
    fill: CATEGORY_COLORS[t.category] ?? '#64748b',
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Payback vs Impact</CardTitle>
        <CardDescription className="text-[11px]">X = payback years, Y = CO2 reduction (tCO2e), size = CAPEX</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" dataKey="x" name="Payback" unit=" yrs" tick={{ fontSize: 11, fill: 'var(--color-foreground)' }} />
              <YAxis type="number" dataKey="y" name="CO2 Reduction" unit=" t" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <ZAxis type="number" dataKey="z" range={[80, 600]} name="CAPEX" unit=" L" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  const n = String(name);
                  if (n === 'Payback') return [`${Number(value).toFixed(1)} years`, n];
                  if (n === 'CO2 Reduction') return [`${Number(value).toFixed(1)} tCO2e`, n];
                  if (n === 'CAPEX') return [`Rs.${Number(value).toFixed(0)} Lakhs`, n];
                  return [String(value), n];
                }}
                contentStyle={tooltipStyle}
              />
              <Scatter data={data} fill="#0f766e">
                {data.map((entry, i) => (
                  <circle key={i} fill={entry.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border pt-2">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{cat.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

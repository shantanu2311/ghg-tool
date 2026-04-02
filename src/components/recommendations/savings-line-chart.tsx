'use client';

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

interface Props {
  impact: CombinedImpact;
}

export function SavingsLineChart({ impact }: Props) {
  const annualSavingMid = (impact.totalAnnualSavingMinInr + impact.totalAnnualSavingMaxInr) / 2;
  const totalCapexMid = ((impact.totalCapexMinLakhs + impact.totalCapexMaxLakhs) / 2) * 100000;

  if (annualSavingMid <= 0 || totalCapexMid <= 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cost Savings Over Time</CardTitle>
          <CardDescription className="text-[11px]">Cumulative savings vs CAPEX investment</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Enable technologies with cost data to see savings projection</p>
        </CardContent>
      </Card>
    );
  }

  const data = Array.from({ length: 11 }, (_, year) => {
    const cumulativeSaving = annualSavingMid * year;
    const netPosition = cumulativeSaving - totalCapexMid;
    return {
      year,
      savings: Math.round(cumulativeSaving / 100000),
      capex: Math.round(totalCapexMid / 100000),
      net: Math.round(netPosition / 100000),
    };
  });

  const paybackYear = annualSavingMid > 0 ? totalCapexMid / annualSavingMid : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cost Savings Over Time</CardTitle>
        <CardDescription className="text-[11px]">
          Cumulative savings vs CAPEX (Rs. Lakhs)
          {paybackYear !== null && ` — Payback at ${paybackYear.toFixed(1)} years`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-foreground)' }} label={{ value: 'Years', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => `Rs.${v}L`} />
              <Tooltip
                formatter={(value, name) => [`Rs.${Number(value).toFixed(0)} Lakhs`, String(name) === 'savings' ? 'Cumulative Savings' : String(name) === 'capex' ? 'Investment' : 'Net Position']}
                contentStyle={chartTheme.tooltipStyle}
              />
              <ReferenceLine y={data[0].capex} stroke={chartTheme.accent.capexLine} strokeDasharray="5 5" label={{ value: 'CAPEX', position: 'right', fontSize: 10 }} />
              <Area type="monotone" dataKey="savings" fill={chartTheme.accent.savingsArea} stroke={chartTheme.accent.savingsLine} strokeWidth={2} />
              {paybackYear !== null && paybackYear <= 10 && (
                <ReferenceLine x={Math.ceil(paybackYear)} stroke={chartTheme.accent.paybackLine} strokeDasharray="3 3" label={{ value: 'Payback', position: 'top', fontSize: 10 }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

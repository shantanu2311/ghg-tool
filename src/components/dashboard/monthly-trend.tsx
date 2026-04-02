'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

interface MonthlyTrendProps {
  result: InventoryResult;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthlyTrend({ result }: MonthlyTrendProps) {
  if (!result.monthlyTrend || result.monthlyTrend.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Trend <InfoTip text="Monthly emission pattern based on entries with month data. Useful for identifying seasonal peaks." /></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No monthly data available</p>
        </CardContent>
      </Card>
    );
  }

  const data = result.monthlyTrend.map((m) => ({
    month: MONTH_LABELS[m.month - 1] ?? `M${m.month}`,
    total: Number(m.total.toFixed(2)),
  }));

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Monthly Trend <InfoTip text="Monthly emission pattern based on entries with month data. Useful for identifying seasonal peaks." /></CardTitle>
        <CardDescription className="text-[11px]">Emissions over the reporting period</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)} tCO2e`, 'Emissions']}
                contentStyle={chartTheme.tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke={chartTheme.scopeDashboard.scope1}
                strokeWidth={2}
                dot={{ fill: chartTheme.scopeDashboard.scope1, r: 3 }}
                activeDot={{ r: 5 }}
                name="CO2e"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

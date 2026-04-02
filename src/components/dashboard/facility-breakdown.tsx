'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Inbox } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';
import { chartTheme } from '@/lib/hooks/use-chart-theme';

interface FacilityBreakdownProps {
  result: InventoryResult;
}

export default function FacilityBreakdown({ result }: FacilityBreakdownProps) {
  const data = result.facilityBreakdown.map((f) => ({
    name: f.facilityName.length > 20 ? f.facilityName.slice(0, 17) + '...' : f.facilityName,
    fullName: f.facilityName,
    total: Number(f.total.toFixed(2)),
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Emissions by Facility <InfoTip text="Emissions split by facility location. Helps identify which plants contribute most to your footprint." /></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No facility data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Emissions by Facility <InfoTip text="Emissions split by facility location. Helps identify which plants contribute most to your footprint." /></CardTitle>
        <CardDescription className="text-[11px]">Total CO2e per facility</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)} tCO2e`, 'Total']}
                contentStyle={chartTheme.tooltipStyle}
              />
              <Bar dataKey="total" fill={chartTheme.accent.facility} radius={[4, 4, 0, 0]} name="CO2e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

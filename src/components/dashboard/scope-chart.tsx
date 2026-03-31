'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

interface ScopeChartProps {
  result: InventoryResult;
}

const COLORS = ['#0f766e', '#f59e0b', '#64748b']; // teal-700, amber-500, slate-500
const LABELS = ['Scope 1', 'Scope 2', 'Scope 3'];

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel(props: any) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const innerRadius = Number(props.innerRadius);
  const outerRadius = Number(props.outerRadius);
  const percent = Number(props.percent);

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

const tooltipStyle = {
  borderRadius: '10px',
  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
  padding: '10px 14px',
  backgroundColor: 'var(--color-card, white)',
  border: '1px solid var(--color-border)',
};

export default function ScopeChart({ result }: ScopeChartProps) {
  const data = [
    { name: 'Scope 1', value: result.scope1.total },
    { name: 'Scope 2', value: result.scope2Location.total },
    { name: 'Scope 3', value: result.scope3.total },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <PieChartIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No emission data to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Scope Breakdown</CardTitle>
        <CardDescription className="text-[11px]">Distribution by scope category</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry, index) => {
                  const colorIndex = LABELS.indexOf(entry.name);
                  return (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[colorIndex >= 0 ? colorIndex : index]}
                      strokeWidth={1}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(2)} tCO2e`, '']}
                contentStyle={tooltipStyle}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{String(value)}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

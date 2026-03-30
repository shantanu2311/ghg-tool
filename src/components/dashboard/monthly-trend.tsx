'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';

interface MonthlyTrendProps {
  result: InventoryResult;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthlyTrend({ result }: MonthlyTrendProps) {
  if (!result.monthlyTrend || result.monthlyTrend.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Monthly Trend</h3>
        <p className="mt-6 text-center text-sm text-zinc-400">No monthly data available</p>
      </div>
    );
  }

  const data = result.monthlyTrend.map((m) => ({
    month: MONTH_LABELS[m.month - 1] ?? `M${m.month}`,
    total: Number(m.total.toFixed(2)),
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Monthly Trend</h3>
      <p className="text-[11px] text-zinc-500">Emissions over the reporting period</p>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#52525b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)} tCO2e`, 'Emissions']}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#0f766e"
              strokeWidth={2}
              dot={{ fill: '#0f766e', r: 3 }}
              activeDot={{ r: 5 }}
              name="CO2e"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

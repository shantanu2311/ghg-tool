'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';

interface TopSourcesProps {
  result: InventoryResult;
}

export default function TopSources({ result }: TopSourcesProps) {
  const data = result.topSources.slice(0, 5).map((s) => ({
    name: s.source.length > 25 ? s.source.slice(0, 22) + '...' : s.source,
    fullName: s.source,
    co2e: Number(s.co2e.toFixed(2)),
    percent: s.percent,
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Top Emission Sources</h3>
        <p className="mt-6 text-center text-sm text-zinc-400">No sources available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Top Emission Sources</h3>
      <p className="text-[11px] text-zinc-500">Top 5 contributors by CO2e</p>
      <div className="mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11, fill: '#52525b' }}
            />
            <Tooltip
              formatter={(value, name) => [`${Number(value).toFixed(2)} tCO2e`, String(name)]}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Bar dataKey="co2e" fill="#0f766e" radius={[0, 4, 4, 0]} name="CO2e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 border-t border-zinc-100 pt-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {result.topSources.slice(0, 5).map((s) => (
            <span key={s.source} className="text-[11px] text-zinc-400">
              {s.source}: {s.percent.toFixed(1)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

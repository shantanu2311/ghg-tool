'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { InventoryResult } from '@/lib/calc-engine/types';

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
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Emissions by Facility</h3>
        <p className="mt-6 text-center text-sm text-zinc-400">No facility data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Emissions by Facility</h3>
      <p className="text-[11px] text-zinc-500">Total CO2e per facility</p>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)} tCO2e`, 'Total']}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="CO2e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';

const COLORS = {
  scope1: '#1D3557',
  scope2: '#2D6A4F',
  scope3: '#F4A261',
};

interface Props {
  impact: CombinedImpact;
}

export function BeforeAfterChart({ impact }: Props) {
  // Calculate post-reduction by scope (proportional reduction)
  const reductionFraction = impact.baselineTotalTonnes > 0
    ? impact.totalReductionTonnes / impact.baselineTotalTonnes
    : 0;

  const data = [
    {
      name: 'Baseline',
      'Scope 1': impact.baselineScope1Tonnes,
      'Scope 2': impact.baselineScope2Tonnes,
      'Scope 3': impact.baselineScope3Tonnes,
    },
    {
      name: 'After Reduction',
      'Scope 1': impact.baselineScope1Tonnes * (1 - reductionFraction),
      'Scope 2': impact.baselineScope2Tonnes * (1 - reductionFraction),
      'Scope 3': impact.baselineScope3Tonnes * (1 - reductionFraction),
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Before vs After Emissions</h3>
      <p className="text-[11px] text-zinc-500">Stacked by scope — baseline vs post-reduction</p>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
            <Tooltip
              formatter={(value) => `${Number(value).toFixed(1)} tCO2e`}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Scope 1" stackId="a" fill={COLORS.scope1} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Scope 2" stackId="a" fill={COLORS.scope2} />
            <Bar dataKey="Scope 3" stackId="a" fill={COLORS.scope3} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';

interface Props {
  impact: CombinedImpact;
}

export function WaterfallChart({ impact }: Props) {
  if (impact.technologySequence.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Reduction Waterfall</h3>
        <p className="text-[11px] text-zinc-500">Toggle technologies to see their contribution</p>
        <div className="mt-4 flex h-[300px] items-center justify-center text-sm text-zinc-400">
          No technologies enabled
        </div>
      </div>
    );
  }

  // Build waterfall data: [Baseline, -Tech1, -Tech2, ..., Final]
  const waterfallData: { name: string; invisible: number; value: number; type: 'total' | 'reduction' }[] = [];

  waterfallData.push({
    name: 'Baseline',
    invisible: 0,
    value: impact.baselineTotalTonnes,
    type: 'total',
  });

  let running = impact.baselineTotalTonnes;
  for (const step of impact.technologySequence) {
    running -= step.reductionTonnes;
    waterfallData.push({
      name: step.name.length > 15 ? step.name.substring(0, 15) + '...' : step.name,
      invisible: running,
      value: step.reductionTonnes,
      type: 'reduction',
    });
  }

  waterfallData.push({
    name: 'After',
    invisible: 0,
    value: impact.postReductionTotalTonnes,
    type: 'total',
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Reduction Waterfall</h3>
      <p className="text-[11px] text-zinc-500">Each technology's contribution to total reduction</p>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
            <Tooltip
              formatter={(value, name) => {
                if (String(name) === 'invisible') return ['', ''];
                return [`${Number(value).toFixed(1)} tCO2e`, String(name) === 'value' ? 'Amount' : String(name)];
              }}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Bar dataKey="invisible" stackId="stack" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="value" stackId="stack" isAnimationActive={false} radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.type === 'total' ? (entry.name === 'Baseline' ? '#8B8B8B' : '#2D6A4F') : '#2EC4B6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

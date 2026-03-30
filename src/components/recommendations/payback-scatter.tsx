'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import type { TechWithFunding } from '@/lib/rec-engine/types';

const CATEGORY_COLORS: Record<string, string> = {
  'Energy Efficiency - Cross Sector': '#0f766e',
  'Sector Specific - Iron & Steel': '#2563eb',
  'Green Electricity': '#059669',
  'Alternative Fuels': '#d97706',
};

interface Props {
  technologies: TechWithFunding[];
  enabledTechIds: Set<string>;
}

export function PaybackScatter({ technologies, enabledTechIds }: Props) {
  const enabled = technologies.filter((t) => enabledTechIds.has(t.techId));

  if (enabled.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Payback vs Impact</h3>
        <p className="text-[11px] text-zinc-500">Bubble size = CAPEX, position = payback × CO2 reduction</p>
        <div className="mt-4 flex h-[300px] items-center justify-center text-sm text-zinc-400">
          Enable technologies to see the scatter plot
        </div>
      </div>
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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Payback vs Impact</h3>
      <p className="text-[11px] text-zinc-500">X = payback years, Y = CO2 reduction (tCO2e), size = CAPEX</p>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis type="number" dataKey="x" name="Payback" unit=" yrs" tick={{ fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="CO2 Reduction" unit=" t" tick={{ fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[80, 600]} name="CAPEX" unit=" L" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                const n = String(name);
                if (n === 'Payback') return [`${Number(value).toFixed(1)} years`, n];
                if (n === 'CO2 Reduction') return [`${Number(value).toFixed(1)} tCO2e`, n];
                if (n === 'CAPEX') return [`₹${Number(value).toFixed(0)} Lakhs`, n];
                return [String(value), n];
              }}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <Scatter data={data} fill="#0f766e">
              {data.map((entry, i) => (
                <circle key={i} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 border-t border-zinc-100 pt-2">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-zinc-500">{cat.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

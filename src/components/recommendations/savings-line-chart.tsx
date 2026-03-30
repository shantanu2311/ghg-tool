'use client';

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { CombinedImpact } from '@/lib/rec-engine/types';

interface Props {
  impact: CombinedImpact;
}

export function SavingsLineChart({ impact }: Props) {
  const annualSavingMid = (impact.totalAnnualSavingMinInr + impact.totalAnnualSavingMaxInr) / 2;
  const totalCapexMid = ((impact.totalCapexMinLakhs + impact.totalCapexMaxLakhs) / 2) * 100000;

  if (annualSavingMid <= 0 || totalCapexMid <= 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Cost Savings Over Time</h3>
        <p className="text-[11px] text-zinc-500">Cumulative savings vs CAPEX investment</p>
        <div className="mt-4 flex h-[300px] items-center justify-center text-sm text-zinc-400">
          Enable technologies with cost data to see savings projection
        </div>
      </div>
    );
  }

  // Generate 0–10 year projection
  const data = Array.from({ length: 11 }, (_, year) => {
    const cumulativeSaving = annualSavingMid * year;
    const netPosition = cumulativeSaving - totalCapexMid;
    return {
      year,
      savings: Math.round(cumulativeSaving / 100000), // convert to lakhs
      capex: Math.round(totalCapexMid / 100000),
      net: Math.round(netPosition / 100000),
    };
  });

  const paybackYear = annualSavingMid > 0 ? totalCapexMid / annualSavingMid : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Cost Savings Over Time</h3>
      <p className="text-[11px] text-zinc-500">
        Cumulative savings vs CAPEX (₹ Lakhs)
        {paybackYear !== null && ` · Payback at ${paybackYear.toFixed(1)} years`}
      </p>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Years', position: 'insideBottomRight', offset: -5, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}L`} />
            <Tooltip
              formatter={(value, name) => [`₹${Number(value).toFixed(0)} Lakhs`, String(name) === 'savings' ? 'Cumulative Savings' : String(name) === 'capex' ? 'Investment' : 'Net Position']}
              contentStyle={{
                borderRadius: '10px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.1)',
                padding: '10px 14px',
                border: '1px solid #e4e4e7',
              }}
            />
            <ReferenceLine y={data[0].capex} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'CAPEX', position: 'right', fontSize: 10 }} />
            <Area type="monotone" dataKey="savings" fill="#d1fae5" stroke="#059669" strokeWidth={2} />
            {paybackYear !== null && paybackYear <= 10 && (
              <ReferenceLine x={Math.ceil(paybackYear)} stroke="#0f766e" strokeDasharray="3 3" label={{ value: 'Payback', position: 'top', fontSize: 10 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

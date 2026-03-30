'use client';

import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine/brsr-mapper';
import { BRSR_FIELDS } from '@/lib/calc-engine/constants';
import type { InventoryResult, BrsrOutput } from '@/lib/calc-engine/types';

interface BrsrTableProps {
  result: InventoryResult;
}

export default function BrsrTable({ result }: BrsrTableProps) {
  const brsr = mapToBrsr({
    scope1: result.scope1,
    scope2: result.scope2Location,
    scope3: result.scope3,
    biogenicCo2Total: result.biogenicCo2Total,
    energyConsumedGj: result.energyConsumedGj,
    renewablePercent: result.renewablePercent,
    intensityMetrics: result.intensityMetrics,
  });

  const efSources = [...new Set(result.calculations.map((c) => c.efSource))];

  const methodology = generateMethodologyNote({
    gwpReport: result.calculations[0]?.gwpReport ?? 'AR5',
    efSources: efSources.length > 0 ? efSources : ['IPCC 2006', 'CEA'],
    boundaryApproach: 'Operational Control',
    scope3Categories: result.scope3.categories.map((c) => c.category),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">BRSR Principle 6 Disclosure</h3>
          <p className="text-[11px] text-zinc-500">SEBI BRSR Core fields mapped from calculated inventory</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-500">Field</th>
              <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-500">Value</th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-500 hidden sm:table-cell">Source</th>
            </tr>
          </thead>
          <tbody>
            {BRSR_FIELDS.map((f) => {
              const value = brsr[f.field as keyof BrsrOutput];
              return (
                <tr key={f.field} className="border-b border-zinc-50 last:border-0">
                  <td className="px-5 py-3 text-zinc-700">{f.label}</td>
                  <td className="px-5 py-3 text-right font-mono text-zinc-900">
                    {value != null ? String(value) : 'N/A'}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-zinc-400 hidden sm:table-cell">
                    {f.source}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Methodology Note</h3>
        <p className="text-[11px] text-zinc-500 mb-3">ISO 14064-1 required disclosure</p>
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-600 font-sans">
          {methodology}
        </pre>
      </div>
    </div>
  );
}

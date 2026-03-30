'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { RecommendationResult } from '@/lib/rec-engine/types';

export default function ReductionReportPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!periodId) return;
    fetch(`/api/recommendations/${periodId}`, { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodId]);

  const handleExport = async (format: 'pdf' | 'word') => {
    if (!data) return;
    setExporting(format);
    try {
      if (format === 'pdf') {
        const { generateReductionPlanPdf } = await import('@/lib/export/reduction-plan-pdf');
        generateReductionPlanPdf(data);
      } else {
        const { generateReductionPlanWord } = await import('@/lib/export/reduction-plan-word');
        await generateReductionPlanWord(data);
      }
    } catch (err) {
      console.error(`Export failed (${format}):`, err);
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error ?? 'No data'}</p>
        </div>
      </div>
    );
  }

  const { recommendations, combinedImpact } = data;
  const enabled = recommendations;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Emission Reduction Plan</h1>
            <p className="text-xs text-zinc-500">Exportable summary of matched technologies and projected impact</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/recommendations/${periodId}`}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Back to Simulator
            </Link>
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              onClick={() => handleExport('word')}
              disabled={exporting !== null}
              className="rounded-md border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              {exporting === 'word' ? 'Exporting...' : 'Export Word'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
        {/* Impact Summary */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Impact Summary</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-zinc-500">Baseline Emissions</p>
              <p className="text-lg font-bold text-zinc-900">{combinedImpact.baselineTotalTonnes.toFixed(1)}</p>
              <p className="text-[10px] text-zinc-400">tCO2e/year</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Potential Reduction</p>
              <p className="text-lg font-bold text-teal-600">{combinedImpact.totalReductionTonnes.toFixed(1)}</p>
              <p className="text-[10px] text-zinc-400">tCO2e/year ({combinedImpact.totalReductionPct.toFixed(1)}%)</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Total CAPEX</p>
              <p className="text-lg font-bold text-zinc-900">
                {combinedImpact.totalCapexMinLakhs > 0
                  ? `₹${combinedImpact.totalCapexMinLakhs.toFixed(0)}–${combinedImpact.totalCapexMaxLakhs.toFixed(0)}L`
                  : 'N/A'}
              </p>
              <p className="text-[10px] text-zinc-400">Lakhs</p>
            </div>
            <div>
              <p className="text-[11px] text-zinc-500">Blended Payback</p>
              <p className="text-lg font-bold text-zinc-900">
                {combinedImpact.blendedPaybackYears !== null
                  ? `${combinedImpact.blendedPaybackYears.toFixed(1)} yrs`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Technology Breakdown */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Technology Breakdown</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Technology</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium text-right">Reduction (tCO2e)</th>
                  <th className="pb-2 pr-4 font-medium text-right">% of Total</th>
                  <th className="pb-2 pr-4 font-medium text-right">CAPEX (₹L)</th>
                  <th className="pb-2 pr-4 font-medium text-right">Payback (yrs)</th>
                  <th className="pb-2 font-medium text-right">Funding</th>
                </tr>
              </thead>
              <tbody>
                {enabled.map((tech) => (
                  <tr key={tech.techId} className="border-b border-zinc-100">
                    <td className="py-2.5 pr-4 font-medium text-zinc-900">{tech.name}</td>
                    <td className="py-2.5 pr-4 text-zinc-600">
                      {tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-800">
                      {tech.reductionMinTonnes.toFixed(1)}–{tech.reductionMaxTonnes.toFixed(1)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-800">{tech.pctOfTotal.toFixed(1)}%</td>
                    <td className="py-2.5 pr-4 text-right text-zinc-800">
                      {tech.capexMinLakhs != null ? `${tech.capexMinLakhs}–${tech.capexMaxLakhs}` : 'N/A'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-zinc-800">
                      {tech.paybackMinYears}–{tech.paybackMaxYears}
                    </td>
                    <td className="py-2.5 text-right text-teal-600">
                      {tech.fundingMatches.length > 0 ? `${tech.fundingMatches.length} scheme${tech.fundingMatches.length > 1 ? 's' : ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Funding Summary */}
        {enabled.some((t) => t.fundingMatches.length > 0) && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Applicable Funding Schemes</h2>
            <div className="mt-4 space-y-3">
              {(() => {
                const seen = new Set<string>();
                const allFunding = enabled.flatMap((t) =>
                  t.fundingMatches.filter((fm) => {
                    if (seen.has(fm.schemeId)) return false;
                    seen.add(fm.schemeId);
                    return true;
                  }).map((fm) => ({ ...fm, techName: t.name }))
                );
                return allFunding.map((fm) => (
                  <div key={fm.schemeId} className="rounded-lg border border-zinc-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900">{fm.name}</h4>
                        <p className="text-[10px] text-zinc-500">{fm.implementingAgency}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                        fm.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {fm.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">{fm.supportType}</p>
                    {fm.subsidyPct !== null && (
                      <p className="mt-1 text-[11px] font-medium text-teal-600">Subsidy: {fm.subsidyPct}%</p>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Waterfall Sequence */}
        {combinedImpact.technologySequence.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-900">Reduction Sequence (Sequential Application)</h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Technologies applied sequentially to residual emissions (not additive)
            </p>
            <div className="mt-3 space-y-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-32 text-zinc-500">Baseline</span>
                <div className="flex-1 h-6 bg-zinc-200 rounded" style={{ width: '100%' }} />
                <span className="w-20 text-right font-medium text-zinc-700">{combinedImpact.baselineTotalTonnes.toFixed(1)} t</span>
              </div>
              {combinedImpact.technologySequence.map((step, i) => (
                <div key={step.techId} className="flex items-center gap-3 text-xs">
                  <span className="w-32 text-zinc-500 truncate" title={step.name}>
                    {i + 1}. {step.name}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-red-500 text-[10px]">−{step.reductionTonnes.toFixed(1)} t</span>
                  </div>
                  <span className="w-20 text-right font-medium text-zinc-700">{step.residualAfterTonnes.toFixed(1)} t</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

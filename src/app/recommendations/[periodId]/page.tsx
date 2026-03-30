'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWhatIfStore } from '@/lib/what-if-store';
import { TechCard } from '@/components/recommendations/tech-card';
import { ImpactSummary } from '@/components/recommendations/impact-summary';
import { BeforeAfterChart } from '@/components/recommendations/before-after-chart';
import { WaterfallChart } from '@/components/recommendations/waterfall-chart';
import { PaybackScatter } from '@/components/recommendations/payback-scatter';
import { SavingsLineChart } from '@/components/recommendations/savings-line-chart';
import { FundingPanel } from '@/components/recommendations/funding-panel';
import Link from 'next/link';

export default function RecommendationsPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const {
    recommendations,
    enabledTechIds,
    combinedImpact,
    isLoading,
    error,
    selectedTechId,
    loadRecommendations,
    toggleTechnology,
    enableAll,
    disableAll,
    selectTech,
  } = useWhatIfStore();

  useEffect(() => {
    if (periodId) loadRecommendations(periodId);
  }, [periodId, loadRecommendations]);

  const selectedTech = selectedTechId
    ? recommendations.find((r) => r.techId === selectedTechId) ?? null
    : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          <p className="mt-3 text-sm text-zinc-500">Analysing your inventory and matching technologies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <p className="mt-1 text-xs text-red-500">Make sure you have calculated emissions for this period first.</p>
        </div>
      </div>
    );
  }

  if (!combinedImpact) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-zinc-900">Emission Reduction Recommendations</h1>
              <p className="text-xs text-zinc-500">
                {recommendations.length} technologies matched your inventory · Toggle to explore impact
              </p>
            </div>
            <Link
              href={`/recommendations/${periodId}/report`}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Export Report
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Impact Summary KPIs */}
        <ImpactSummary impact={combinedImpact} enabledCount={enabledTechIds.size} />

        {/* 3-column layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* LEFT: Technology Cards */}
          <div className="xl:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Technologies</h2>
              <div className="flex gap-1">
                <button
                  onClick={enableAll}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-teal-600 hover:bg-teal-50"
                >
                  All on
                </button>
                <button
                  onClick={disableAll}
                  className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100"
                >
                  All off
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-3 xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto xl:pr-1">
              {recommendations.map((tech) => (
                <TechCard
                  key={tech.techId}
                  tech={tech}
                  enabled={enabledTechIds.has(tech.techId)}
                  selected={selectedTechId === tech.techId}
                  onToggle={() => toggleTechnology(tech.techId)}
                  onSelect={() => selectTech(selectedTechId === tech.techId ? null : tech.techId)}
                />
              ))}
              {recommendations.length === 0 && (
                <p className="text-sm text-zinc-400">No matching technologies found for your inventory profile.</p>
              )}
            </div>
          </div>

          {/* CENTRE: Charts */}
          <div className="space-y-6 xl:col-span-6">
            <BeforeAfterChart impact={combinedImpact} />
            <WaterfallChart impact={combinedImpact} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PaybackScatter technologies={recommendations} enabledTechIds={enabledTechIds} />
              <SavingsLineChart impact={combinedImpact} />
            </div>
          </div>

          {/* RIGHT: Funding Panel */}
          <div className="xl:col-span-3">
            <FundingPanel tech={selectedTech} />
          </div>
        </div>
      </div>
    </div>
  );
}

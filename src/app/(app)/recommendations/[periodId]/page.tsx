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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, FileText, Loader2, Inbox } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Analysing your inventory and matching technologies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">Make sure you have calculated emissions for this period first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!combinedImpact) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emission Reduction Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {recommendations.length} technologies matched your inventory -- Toggle to explore impact
          </p>
        </div>
        <Link
          href={`/recommendations/${periodId}/report`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Export Report
        </Link>
      </div>

      {/* Impact Summary KPIs */}
      <ImpactSummary impact={combinedImpact} enabledCount={enabledTechIds.size} />

      {/* 3-column layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT: Technology Cards */}
        <div className="xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Technologies</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={enableAll} className="text-[10px] h-6 px-2 text-primary">
                All on
              </Button>
              <Button variant="ghost" size="sm" onClick={disableAll} className="text-[10px] h-6 px-2">
                All off
              </Button>
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
              <Card>
                <CardContent className="flex flex-col items-center py-8">
                  <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No matching technologies found for your inventory profile.</p>
                </CardContent>
              </Card>
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
  );
}

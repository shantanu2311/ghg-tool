'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWhatIfStore } from '@/lib/what-if-store';
import { TechCard } from '@/components/recommendations/tech-card';
import { ImpactSummary } from '@/components/recommendations/impact-summary';
import { BeforeAfterChart } from '@/components/recommendations/before-after-chart';
import { WaterfallChart } from '@/components/recommendations/waterfall-chart';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Loader2, Inbox, Star, Info, Landmark, ArrowRight } from 'lucide-react';
import { LEVER_GROUPS, TECH_TO_LEVER, pickRecommended } from '@/lib/rec-engine/lever-groups';
import { Badge } from '@/components/ui/badge';

export default function RecommendationsPage() {
  const { periodId } = useParams<{ periodId: string }>();

  const {
    recommendations,
    enabledTechIds,
    implementedPcts,
    combinedImpact,
    isLoading,
    error,
    loadRecommendations,
    toggleTechnology,
    setImplementedPct,
    enableAll,
    disableAll,
  } = useWhatIfStore();

  useEffect(() => {
    if (periodId) loadRecommendations(periodId);
  }, [periodId, loadRecommendations]);

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

  // ── Separate techs into lever groups and independent ──
  const groupedTechs = new Map<string, typeof recommendations>();
  const independentTechs: typeof recommendations = [];

  for (const tech of recommendations) {
    const lever = TECH_TO_LEVER[tech.techId];
    if (lever) {
      const arr = groupedTechs.get(lever) ?? [];
      arr.push(tech);
      groupedTechs.set(lever, arr);
    } else {
      independentTechs.push(tech);
    }
  }

  const recommendedByLever = new Map<string, string>();
  for (const [lever, techs] of groupedTechs) {
    const best = pickRecommended(techs);
    if (best) recommendedByLever.set(lever, best);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emission Reduction Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {recommendations.length} technologies matched your inventory — Toggle to explore impact
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

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 px-4 py-3">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
          These recommendations are <span className="font-semibold">indicative estimates</span> based on your reported emissions data and sector benchmarks. Actual reduction potential, costs, and payback periods will depend on a <span className="font-semibold">detailed energy audit</span> of your facilities. If you have already implemented any technology, mark it below to adjust the remaining reduction potential.
        </p>
      </div>

      {/* Impact Summary KPIs */}
      <ImpactSummary impact={combinedImpact} enabledCount={enabledTechIds.size} />

      {/* ── Technology Selection — Horizontal scrollable strip ──────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
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

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-3 min-w-max">
            {/* Lever groups */}
            {LEVER_GROUPS.map((group) => {
              const techs = groupedTechs.get(group.lever);
              if (!techs || techs.length === 0) return null;
              const recommendedId = recommendedByLever.get(group.lever);
              const groupImplPct = implementedPcts[techs[0].techId] ?? 0;
              const isGroupFullyImplemented = groupImplPct >= 100;

              return (
                <div key={group.lever} className={cn(
                  'rounded-xl border p-2.5 shrink-0',
                  isGroupFullyImplemented
                    ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10'
                    : 'border-border bg-muted/20',
                )}>
                  <div className="mb-2 px-1">
                    <p className="text-xs font-semibold text-foreground">{group.label}</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">
                      {isGroupFullyImplemented
                        ? 'Fully implemented'
                        : groupImplPct > 0
                        ? `${groupImplPct}% done — ${100 - groupImplPct}% remaining`
                        : `${group.description} — pick one`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {techs.map((tech) => (
                      <div key={tech.techId} className="relative w-[260px] shrink-0">
                        {tech.techId === recommendedId && (
                          <Badge className="absolute -top-1.5 right-2 z-10 bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" /> Recommended
                          </Badge>
                        )}
                        <TechCard
                          tech={tech}
                          enabled={enabledTechIds.has(tech.techId)}
                          implementedPct={implementedPcts[tech.techId] ?? 0}
                          onToggle={() => toggleTechnology(tech.techId)}
                          onImplementedChange={(pct) => setImplementedPct(tech.techId, pct)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Independent technologies */}
            {independentTechs.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-2.5 shrink-0">
                {groupedTechs.size > 0 && (
                  <div className="mb-2 px-1">
                    <p className="text-xs font-semibold text-foreground">Independent Measures</p>
                    <p className="text-[10px] text-muted-foreground">Can be combined</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {independentTechs.map((tech) => (
                    <div key={tech.techId} className="w-[260px] shrink-0">
                      <TechCard
                        tech={tech}
                        enabled={enabledTechIds.has(tech.techId)}
                        implementedPct={implementedPcts[tech.techId] ?? 0}
                        onToggle={() => toggleTechnology(tech.techId)}
                        onImplementedChange={(pct) => setImplementedPct(tech.techId, pct)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {recommendations.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-8">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No matching technologies found for your inventory profile.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Full-width Charts ──────────────────────────────────────────── */}
      <WaterfallChart impact={combinedImpact} technologies={recommendations} enabledTechIds={enabledTechIds} />
      <BeforeAfterChart impact={combinedImpact} />

      {/* ── Next Step CTA — Funding ────────────────────────────────────── */}
      {(() => {
        const enabledTechs = recommendations.filter((r) => enabledTechIds.has(r.techId));
        const techsWithFunding = enabledTechs.filter((r) => r.fundingMatches.length > 0);
        const uniqueSchemeIds = new Set(techsWithFunding.flatMap((t) => t.fundingMatches.map((m) => m.schemeId)));
        const totalSchemes = uniqueSchemeIds.size;

        return (
          <Card className="border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.05]">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Explore Funding &amp; Subsidies</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalSchemes > 0
                      ? `${totalSchemes} government scheme${totalSchemes > 1 ? 's' : ''} match${totalSchemes === 1 ? 'es' : ''} your selected technologies — subsidies, interest subvention, and zero-cost models available.`
                      : 'Browse government schemes for energy efficiency, solar, and fuel switching in MSMEs.'}
                  </p>
                </div>
              </div>
              <Link
                href="/funding"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 group"
              >
                View Funding
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

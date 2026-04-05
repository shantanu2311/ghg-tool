'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWhatIfStore } from '@/lib/what-if-store';
import type { TechWithFunding } from '@/lib/rec-engine/types';
import { TechCard } from '@/components/recommendations/tech-card';
import { ImpactSummary } from '@/components/recommendations/impact-summary';
import { BeforeAfterChart } from '@/components/recommendations/before-after-chart';
import { WaterfallChart } from '@/components/recommendations/waterfall-chart';
import { ApplicabilitySetup } from '@/components/recommendations/applicability-setup';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Loader2, Inbox, Star, Info, Landmark, ArrowRight, ChevronDown } from 'lucide-react';
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
    setupComplete,
    loadRecommendations,
    toggleTechnology,
    setImplementedPct,
    enableAll,
    disableAll,
    completeSetup,
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

  // ── Applicability Setup (first visit) ──
  if (!setupComplete && recommendations.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emission Reduction Potential</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Before we show your reduction potential, let us know what&apos;s relevant to your facility
          </p>
        </div>
        <ApplicabilitySetup
          recommendations={recommendations}
          baselineTotal={combinedImpact.baselineTotalTonnes}
          onComplete={completeSetup}
        />
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold tracking-tight">Emission Reduction Potential</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enabledTechIds.size} of {recommendations.length} technologies active — Toggle to explore impact
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
          These recommendations are <span className="font-semibold">indicative estimates</span> based on your reported emissions data and sector benchmarks. End-use energy splits (e.g., lighting vs motors vs furnace) are <span className="font-semibold">baseline assumptions</span> for a standard facility of this type, sourced from BEE energy audits, SAMEEEKSHA cluster studies, and UNIDO compendiums. Actual reduction potential will depend on a <span className="font-semibold">detailed energy audit</span> of your facilities.
        </p>
      </div>

      {/* Impact Summary KPIs */}
      <ImpactSummary impact={combinedImpact} enabledCount={enabledTechIds.size} />

      {/* ── Technology Selection — Collapsible sections ──────────────── */}
      <TechnologySections
        groupedTechs={groupedTechs}
        independentTechs={independentTechs}
        recommendedByLever={recommendedByLever}
        enabledTechIds={enabledTechIds}
        implementedPcts={implementedPcts}
        toggleTechnology={toggleTechnology}
        setImplementedPct={setImplementedPct}
        enableAll={enableAll}
        disableAll={disableAll}
        recommendations={recommendations}
      />

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

// ── Collapsible Technology Sections ─────────────────────────────────────────

interface TechnologySectionsProps {
  groupedTechs: Map<string, TechWithFunding[]>;
  independentTechs: TechWithFunding[];
  recommendedByLever: Map<string, string>;
  enabledTechIds: Set<string>;
  implementedPcts: Record<string, number>;
  toggleTechnology: (techId: string) => void;
  setImplementedPct: (techId: string, pct: number) => void;
  enableAll: () => void;
  disableAll: () => void;
  recommendations: TechWithFunding[];
}

function TechnologySections({
  groupedTechs,
  independentTechs,
  recommendedByLever,
  enabledTechIds,
  implementedPcts,
  toggleTechnology,
  setImplementedPct,
  enableAll,
  disableAll,
  recommendations,
}: TechnologySectionsProps) {
  // All sections collapsed by default — user already made selections in setup
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
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

      {/* Lever groups */}
      {LEVER_GROUPS.map((group) => {
        const techs = groupedTechs.get(group.lever);
        if (!techs || techs.length === 0) return null;
        const recommendedId = recommendedByLever.get(group.lever);
        const isOpen = openSections.has(group.lever);

        // Summary stats for collapsed header
        const enabledCount = techs.filter((t) => enabledTechIds.has(t.techId)).length;
        const enabledTech = techs.find((t) => enabledTechIds.has(t.techId));
        const groupImplPct = implementedPcts[techs[0].techId] ?? 0;
        const isGroupFullyImplemented = groupImplPct >= 100;

        return (
          <Card key={group.lever} className={cn(
            'overflow-hidden',
            isGroupFullyImplemented && 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/10',
          )}>
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => toggleSection(group.lever)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                !isOpen && '-rotate-90',
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">{group.label}</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {techs.length} option{techs.length > 1 ? 's' : ''} — pick one
                  </Badge>
                  {isGroupFullyImplemented && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0">
                      Fully implemented
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isGroupFullyImplemented
                    ? group.description
                    : enabledCount > 0 && enabledTech
                    ? <>Active: <span className="font-medium text-foreground">{enabledTech.name}</span>{groupImplPct > 0 && groupImplPct < 100 ? ` (${groupImplPct}% done)` : ''}</>
                    : `${group.description} — none active`}
                </p>
              </div>
              {enabledCount > 0 && !isGroupFullyImplemented && (
                <Badge className="text-[10px] bg-primary/10 text-primary px-1.5 py-0 shrink-0">
                  {enabledCount} active
                </Badge>
              )}
            </button>

            {/* Expandable content */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {techs.map((tech) => (
                    <div key={tech.techId} className="relative flex flex-col">
                      {tech.techId === recommendedId && (
                        <Badge className="absolute -top-1.5 right-2 z-10 bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5" /> Recommended
                        </Badge>
                      )}
                      <div className="flex-1 flex flex-col [&>div]:flex-1">
                        <TechCard
                          tech={tech}
                          enabled={enabledTechIds.has(tech.techId)}
                          implementedPct={implementedPcts[tech.techId] ?? 0}
                          onToggle={() => toggleTechnology(tech.techId)}
                          onImplementedChange={(pct) => setImplementedPct(tech.techId, pct)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Independent technologies */}
      {independentTechs.length > 0 && (() => {
        const isOpen = openSections.has('independent');
        const enabledCount = independentTechs.filter((t) => enabledTechIds.has(t.techId)).length;

        return (
          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('independent')}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
            >
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                !isOpen && '-rotate-90',
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">Energy Efficiency Measures</p>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {independentTechs.length} measure{independentTechs.length > 1 ? 's' : ''} — can combine
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {enabledCount > 0
                    ? <>{enabledCount} of {independentTechs.length} active — reductions applied sequentially</>
                    : 'Each targets a different part of your operations — none active'}
                </p>
              </div>
              {enabledCount > 0 && (
                <Badge className="text-[10px] bg-primary/10 text-primary px-1.5 py-0 shrink-0">
                  {enabledCount} active
                </Badge>
              )}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-border/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {independentTechs.map((tech) => (
                    <div key={tech.techId} className="flex flex-col [&>div]:flex-1">
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
          </Card>
        );
      })()}

      {recommendations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-8">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No matching technologies found for your inventory profile.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

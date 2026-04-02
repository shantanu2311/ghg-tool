'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWhatIfStore } from '@/lib/what-if-store';
import type { TechWithFunding, FundingMatch } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  IndianRupee,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentChecklist } from './document-checklist';
import { JargonTerm } from './jargon-term';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActionStepData {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[] | null;
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
}

interface SchemeSteps {
  scheme: {
    schemeId: string;
    name: string;
    implementingAgency: string;
    supportType: string;
    status: string;
    applicationUrl: string | null;
  };
  steps: ActionStepData[];
}

/** A scheme section in the curated plan */
interface SchemeSection {
  schemeId: string;
  schemeName: string;
  schemeAgency: string;
  supportType: string;
  status: string;
  applicationUrl: string | null;
  techNames: string[];        // Technologies funded by this scheme
  steps: StepItem[];           // Steps in order, with dedup applied
}

interface StepItem {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[];
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const JARGON_TERMS = ['DEA', 'IGEA', 'DPR', 'ESCO', 'M&V', 'CGTMSE', 'PRSF', 'EOI', 'PPA', 'RESCO', 'CEA', 'AEA', 'NCV', 'SDA', 'EPC'];

function renderWithJargon(text: string) {
  const regex = new RegExp(`\\b(${JARGON_TERMS.join('|')})\\b`, 'g');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    JARGON_TERMS.includes(part) ? <JargonTerm key={i} term={part} /> : <span key={i}>{part}</span>,
  );
}

function fmtLakhs(v: number | null | undefined): string {
  if (v == null || v === 0) return '₹0';
  if (v >= 100) return `₹${(v / 100).toFixed(1)} Cr`;
  return `₹${v.toFixed(1)}L`;
}

function fmtInr(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

/** Pick the best funding scheme for a technology */
function pickBestScheme(tech: TechWithFunding): FundingMatch | null {
  const active = tech.fundingMatches.filter((m) => m.status === 'Active');
  if (active.length === 0) return tech.fundingMatches[0] ?? null;

  return active.reduce((best, m) => {
    if (m.netCapexMinLakhs != null && (best.netCapexMinLakhs == null || m.netCapexMinLakhs < best.netCapexMinLakhs)) {
      return m;
    }
    if (m.netCapexMinLakhs === best.netCapexMinLakhs && (m.subsidyPct ?? 0) > (best.subsidyPct ?? 0)) {
      return m;
    }
    return best;
  });
}

/* ------------------------------------------------------------------ */
/*  Deduplication                                                      */
/* ------------------------------------------------------------------ */

/** Patterns that identify equivalent steps across schemes */
const DEDUP_PATTERNS: { key: string; patterns: RegExp[] }[] = [
  { key: 'eligibility_check', patterns: [/check.*eligib/i, /verify.*udyam/i, /eligib.*check/i] },
  { key: 'energy_audit', patterns: [/energy audit/i, /\bDEA\b/, /\bIGEA\b/] },
  { key: 'dpr', patterns: [/\bDPR\b/, /detailed project report/i] },
  { key: 'bank_loan', patterns: [/bank loan/i, /loan.*sanction/i, /loan.*appli/i] },
  { key: 'eoi', patterns: [/submit.*eoi/i, /expression of interest/i] },
];

function getDedupKey(step: ActionStepData): string | null {
  const text = step.title + ' ' + step.description;
  for (const { key, patterns } of DEDUP_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return key;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Build curated plan — scheme-grouped, step-ordered, deduplicated    */
/* ------------------------------------------------------------------ */

function buildCuratedPlan(
  enabledTechs: TechWithFunding[],
  schemeStepsMap: Map<string, SchemeSteps>,
): SchemeSection[] {
  // 1. Group techs by best scheme
  const techsByScheme = new Map<string, { techs: TechWithFunding[]; scheme: FundingMatch }>();

  for (const tech of enabledTechs) {
    const bestScheme = pickBestScheme(tech);
    if (!bestScheme) continue;

    const existing = techsByScheme.get(bestScheme.schemeId);
    if (existing) {
      existing.techs.push(tech);
    } else {
      techsByScheme.set(bestScheme.schemeId, { techs: [tech], scheme: bestScheme });
    }
  }

  // 2. Process schemes in priority order (most comprehensive first)
  const schemeOrder = ['S001', 'S004', 'S002', 'S003', 'S006', 'S007', 'S010', 'S005', 'S008', 'S009'];
  const sortedSchemeIds = Array.from(techsByScheme.keys()).sort((a, b) => {
    const ia = schemeOrder.indexOf(a);
    const ib = schemeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // 3. Build sections, keeping scheme step order, deduplicating across schemes
  const coveredDedupKeys = new Set<string>();
  const sections: SchemeSection[] = [];

  for (const sid of sortedSchemeIds) {
    const group = techsByScheme.get(sid)!;
    const stepsData = schemeStepsMap.get(sid);
    if (!stepsData) continue;

    const steps: StepItem[] = [];
    let stepCounter = 1;

    for (const step of stepsData.steps) {
      const dedupKey = getDedupKey(step);

      // Skip if this step type was already covered by an earlier scheme
      if (dedupKey && coveredDedupKeys.has(dedupKey)) continue;

      // Mark as covered for subsequent schemes
      if (dedupKey) coveredDedupKeys.add(dedupKey);

      steps.push({
        stepNumber: stepCounter++,
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime,
        estimatedCost: step.estimatedCost,
        documentsNeeded: step.documentsNeeded ?? [],
        actionUrl: step.actionUrl,
        actionLabel: step.actionLabel,
        tips: step.tips,
      });
    }

    if (steps.length === 0) continue;

    sections.push({
      schemeId: sid,
      schemeName: stepsData.scheme.name,
      schemeAgency: stepsData.scheme.implementingAgency,
      supportType: stepsData.scheme.supportType,
      status: stepsData.scheme.status,
      applicationUrl: stepsData.scheme.applicationUrl,
      techNames: group.techs.map((t) => t.name),
      steps,
    });
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Step card component                                                */
/* ------------------------------------------------------------------ */

function StepCard({ step, stepIndex, totalSteps }: { step: StepItem; stepIndex: number; totalSteps: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className={cn('relative flex gap-3', !isLast && 'pb-4')}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-[10px] font-bold text-primary">
          {step.stepNumber}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left group"
        >
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {step.title}
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {step.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {step.estimatedTime}
                </span>
              )}
              {step.estimatedCost && (
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {step.estimatedCost}
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            className={cn('h-4 w-4 text-muted-foreground transition-transform mt-0.5 shrink-0', expanded && 'rotate-90')}
          />
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-foreground leading-relaxed">
              {renderWithJargon(step.description)}
            </p>

            {step.tips && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Tip:</span> {step.tips}
                </p>
              </div>
            )}

            {step.documentsNeeded.length > 0 && (
              <DocumentChecklist documents={step.documentsNeeded} />
            )}

            {step.actionUrl && (
              <a href={step.actionUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  {step.actionLabel ?? 'Open Link'}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CuratedPlan({ className }: { className?: string }) {
  const recommendations = useWhatIfStore((s) => s.recommendations);
  const enabledTechIds = useWhatIfStore((s) => s.enabledTechIds);
  const combinedImpact = useWhatIfStore((s) => s.combinedImpact);
  const periodId = useWhatIfStore((s) => s.periodId);

  const [schemeStepsMap, setSchemeStepsMap] = useState<Map<string, SchemeSteps>>(new Map());
  const [loading, setLoading] = useState(false);

  const enabledTechs = useMemo(
    () => recommendations.filter((r) => enabledTechIds.has(r.techId)),
    [recommendations, enabledTechIds],
  );

  const neededSchemeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tech of enabledTechs) {
      const best = pickBestScheme(tech);
      if (best) ids.add(best.schemeId);
    }
    return ids;
  }, [enabledTechs]);

  // Fetch action plan steps for all needed schemes
  useEffect(() => {
    if (neededSchemeIds.size === 0) return;
    const toFetch = Array.from(neededSchemeIds).filter((id) => !schemeStepsMap.has(id));
    if (toFetch.length === 0) return;

    setLoading(true);
    Promise.all(
      toFetch.map((sid) =>
        fetch(`/api/action-plans/${sid}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data ? [sid, data as SchemeSteps] as const : null)),
      ),
    )
      .then((results) => {
        setSchemeStepsMap((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r) next.set(r[0], r[1]);
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [neededSchemeIds, schemeStepsMap]);

  // Build the curated plan — scheme-grouped sections
  const sections = useMemo(
    () => buildCuratedPlan(enabledTechs, schemeStepsMap),
    [enabledTechs, schemeStepsMap],
  );

  // Consolidated document list across all sections
  const allDocuments = useMemo(() => {
    const docs = new Set<string>();
    for (const section of sections) {
      for (const step of section.steps) {
        for (const doc of step.documentsNeeded) docs.add(doc);
      }
    }
    return Array.from(docs);
  }, [sections]);

  // Tech → scheme mapping for summary header
  const techSchemeMap = useMemo(() => {
    const map: { tech: TechWithFunding; scheme: FundingMatch }[] = [];
    for (const tech of enabledTechs) {
      const scheme = pickBestScheme(tech);
      if (scheme) map.push({ tech, scheme });
    }
    return map;
  }, [enabledTechs]);

  const uniqueSchemeCount = new Set(techSchemeMap.map((m) => m.scheme.schemeId)).size;

  /* ---------------------------------------------------------------- */
  /*  No recommendations data — CTA                                    */
  /* ---------------------------------------------------------------- */

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">Your Curated Action Plan</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Complete your GHG inventory and select technologies in the Recommendations page.
            We&apos;ll build a personalised action plan matching your selected technologies with
            the best funding schemes.
          </p>
          <Link href="/recommendations">
            <Button variant="default" size="sm" className="gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Go to Recommendations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  No enabled techs                                                 */
  /* ---------------------------------------------------------------- */

  if (enabledTechs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">No Technologies Selected</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Enable technologies in the Recommendations simulator, then come back to see your
            curated action plan with matched funding schemes.
          </p>
          {periodId && (
            <Link href={`/recommendations/${periodId}`}>
              <Button variant="default" size="sm" className="gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Go to Simulator
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading && sections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              Your Curated Action Plan
            </CardTitle>
          </div>
          <CardDescription className="text-[11px]">
            {enabledTechs.length} {enabledTechs.length === 1 ? 'technology' : 'technologies'} matched
            with {uniqueSchemeCount} funding {uniqueSchemeCount === 1 ? 'scheme' : 'schemes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tech → Scheme mapping */}
          <div className="space-y-2">
            {techSchemeMap.map(({ tech, scheme }) => (
              <div
                key={tech.techId}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-muted-foreground shrink-0">{tech.techId}</span>
                  <span className="font-medium truncate">{tech.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20">
                    {scheme.name.length > 25 ? scheme.name.slice(0, 22) + '...' : scheme.name}
                  </Badge>
                  {scheme.subsidyPct != null && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {scheme.subsidyPct}% off
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Impact summary */}
          {combinedImpact && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground">CO₂ Reduction</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {combinedImpact.totalReductionTonnes.toFixed(1)} tCO₂e
                  <span className="text-xs font-normal ml-1">({combinedImpact.totalReductionPct.toFixed(0)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total CAPEX</p>
                <p className="text-sm font-bold">
                  {fmtLakhs(combinedImpact.totalCapexMinLakhs)}–{fmtLakhs(combinedImpact.totalCapexMaxLakhs)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Annual Savings</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtInr(combinedImpact.totalAnnualSavingMinInr)}–{fmtInr(combinedImpact.totalAnnualSavingMaxInr)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Blended Payback</p>
                <p className="text-sm font-bold">
                  {combinedImpact.blendedPaybackYears != null
                    ? `${combinedImpact.blendedPaybackYears.toFixed(1)} years`
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheme sections — each section shows the full step sequence for a scheme */}
      {sections.map((section, sectionIndex) => (
        <Card key={section.schemeId}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {sectionIndex + 1}
                  </span>
                  {section.schemeName}
                </CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  {section.supportType} — {section.schemeAgency}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[10px]',
                  section.status === 'Active'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-amber-500 text-amber-600 dark:text-amber-400',
                )}
              >
                {section.status}
              </Badge>
            </div>
            {/* Technologies covered by this scheme */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground mr-1">Covers:</span>
              {section.techNames.map((name) => (
                <Badge key={name} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {section.steps.map((step, i) => (
                <StepCard
                  key={`${section.schemeId}-${step.stepNumber}`}
                  step={step}
                  stepIndex={i}
                  totalSteps={section.steps.length}
                />
              ))}
            </div>
            {section.applicationUrl && (
              <div className="mt-4 pt-3 border-t border-border">
                <a href={section.applicationUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Go to {section.schemeName} Portal
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Consolidated document checklist */}
      {allDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                All Documents Needed
              </CardTitle>
              <CardDescription className="text-[11px] ml-auto">
                Consolidated across all schemes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentChecklist documents={allDocuments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

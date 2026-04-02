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
  Zap,
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

/** A phase groups related steps across schemes */
interface Phase {
  id: string;
  title: string;
  icon: 'preparation' | 'assessment' | 'planning' | 'financing' | 'implementation' | 'verification';
  items: PhaseItem[];
}

interface PhaseItem {
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[];
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
  techNames: string[];      // Which technologies this step covers
  schemeName: string;       // Which scheme this step comes from
  schemeId: string;
  isReference: boolean;     // If true, this step references a step already covered
  referenceText: string | null; // e.g. "Already covered in Preparation phase"
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// Jargon terms to auto-link
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

  // Prefer: lowest net CAPEX, then highest subsidy %
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

/** Classify a step into a phase category based on its content */
function classifyStep(step: ActionStepData, schemeId: string): Phase['icon'] {
  const t = (step.title + ' ' + step.description).toLowerCase();

  if (t.includes('eligib') || t.includes('register') || t.includes('udyam') || t.includes('verify')) return 'preparation';
  if (t.includes('audit') || t.includes('assessment') || t.includes('survey') || t.includes('feasib')) return 'assessment';
  if (t.includes('dpr') || t.includes('project report') || t.includes('choose') || t.includes('proposal') || t.includes('contract') || t.includes('agreement')) return 'planning';
  if (t.includes('loan') || t.includes('subsid') || t.includes('financ') || t.includes('sanction') || t.includes('apply') || t.includes('guarantee') || t.includes('reimburse')) return 'financing';
  if (t.includes('install') || t.includes('procure') || t.includes('implement') || t.includes('commission') || t.includes('equipment')) return 'implementation';
  if (t.includes('verif') || t.includes('m&v') || t.includes('monitor') || t.includes('saving') || t.includes('track') || t.includes('repay') || t.includes('meter')) return 'verification';

  return 'implementation'; // default
}

const PHASE_ORDER: Phase['icon'][] = ['preparation', 'assessment', 'planning', 'financing', 'implementation', 'verification'];

const PHASE_TITLES: Record<Phase['icon'], string> = {
  preparation: 'Preparation & Eligibility',
  assessment: 'Energy Assessment & Surveys',
  planning: 'Project Planning & DPR',
  financing: 'Financing & Subsidies',
  implementation: 'Procurement & Installation',
  verification: 'Verification & Savings',
};

const PHASE_ICONS: Record<Phase['icon'], typeof CheckCircle2> = {
  preparation: FileText,
  assessment: Zap,
  planning: FileText,
  financing: IndianRupee,
  implementation: Zap,
  verification: CheckCircle2,
};

/* ------------------------------------------------------------------ */
/*  Step deduplication                                                  */
/* ------------------------------------------------------------------ */

/** Key patterns that indicate duplicate steps across schemes */
const DEDUP_PATTERNS: { key: string; patterns: RegExp[] }[] = [
  { key: 'udyam_check', patterns: [/udyam/i, /eligib.*check/i] },
  { key: 'energy_audit', patterns: [/energy audit/i, /dea/i, /detailed energy audit/i] },
  { key: 'dpr_prep', patterns: [/dpr|detailed project report/i] },
  { key: 'bank_loan', patterns: [/bank loan|loan.*sanction|loan.*appli/i] },
  { key: 'cgtmse', patterns: [/cgtmse|collateral.free/i] },
  { key: 'eoi_submit', patterns: [/expression of interest|submit.*eoi/i] },
];

function getDedupKey(step: ActionStepData): string | null {
  const text = step.title + ' ' + step.description;
  for (const { key, patterns } of DEDUP_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return key;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Build curated plan                                                 */
/* ------------------------------------------------------------------ */

function buildCuratedPlan(
  enabledTechs: TechWithFunding[],
  schemeStepsMap: Map<string, SchemeSteps>,
): Phase[] {
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

  // 2. Build phase items from action plan steps, grouped by phase category
  const phaseItems = new Map<Phase['icon'], PhaseItem[]>();
  for (const phase of PHASE_ORDER) phaseItems.set(phase, []);

  const coveredDedupKeys = new Set<string>();

  // Process schemes in a priority order: ADEETIE first (most comprehensive), then others
  const schemeOrder = ['S001', 'S004', 'S002', 'S003', 'S006', 'S007', 'S010', 'S005', 'S008', 'S009'];
  const sortedSchemeIds = Array.from(techsByScheme.keys()).sort((a, b) => {
    const ia = schemeOrder.indexOf(a);
    const ib = schemeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  for (const sid of sortedSchemeIds) {
    const group = techsByScheme.get(sid)!;
    const stepsData = schemeStepsMap.get(sid);
    if (!stepsData) continue;

    const techNames = group.techs.map((t) => t.name);

    for (const step of stepsData.steps) {
      const phaseCategory = classifyStep(step, sid);
      const dedupKey = getDedupKey(step);

      // Check if this step is a duplicate of one already covered
      if (dedupKey && coveredDedupKeys.has(dedupKey)) {
        // Add a reference instead of the full step
        phaseItems.get(phaseCategory)!.push({
          title: step.title,
          description: '',
          estimatedTime: null,
          estimatedCost: null,
          documentsNeeded: [],
          actionUrl: null,
          actionLabel: null,
          tips: null,
          techNames,
          schemeName: group.scheme.name,
          schemeId: sid,
          isReference: true,
          referenceText: `Already covered above — reuse the same ${dedupKey === 'energy_audit' ? 'audit report' : dedupKey === 'dpr_prep' ? 'DPR' : dedupKey === 'bank_loan' ? 'loan application' : 'documents'} for ${group.scheme.name}`,
        });
        continue;
      }

      // Mark this step pattern as covered
      if (dedupKey) coveredDedupKeys.add(dedupKey);

      phaseItems.get(phaseCategory)!.push({
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime,
        estimatedCost: step.estimatedCost,
        documentsNeeded: step.documentsNeeded ?? [],
        actionUrl: step.actionUrl,
        actionLabel: step.actionLabel,
        tips: step.tips,
        techNames,
        schemeName: group.scheme.name,
        schemeId: sid,
        isReference: false,
        referenceText: null,
      });
    }
  }

  // 3. Build phases (skip empty ones)
  const phases: Phase[] = [];
  for (const phaseKey of PHASE_ORDER) {
    const items = phaseItems.get(phaseKey) ?? [];
    if (items.length === 0) continue;
    phases.push({
      id: phaseKey,
      title: PHASE_TITLES[phaseKey],
      icon: phaseKey,
      items,
    });
  }

  return phases;
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function PhaseItemCard({ item, isLast }: { item: PhaseItem; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (item.isReference) {
    return (
      <div className={cn('relative flex gap-3', !isLast && 'pb-4')}>
        <div className="flex flex-col items-center">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 bg-muted/30">
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
          </div>
          {!isLast && <div className="w-px flex-1 bg-border/50" />}
        </div>
        <div className="flex-1 pb-1">
          <p className="text-xs text-muted-foreground italic">{item.referenceText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative flex gap-3', !isLast && 'pb-4')}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
          <CheckCircle2 className="h-3 w-3 text-primary" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left group"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tech badges */}
              {item.techNames.map((name) => (
                <Badge key={name} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                  {name.length > 25 ? name.slice(0, 22) + '...' : name}
                </Badge>
              ))}
              {/* Scheme badge */}
              <Badge className="text-[10px] py-0 px-1.5 font-normal bg-primary/10 text-primary border-primary/20">
                via {item.schemeName.length > 30 ? item.schemeName.slice(0, 27) + '...' : item.schemeName}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {item.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.estimatedTime}
                </span>
              )}
              {item.estimatedCost && (
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {item.estimatedCost}
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
              {renderWithJargon(item.description)}
            </p>

            {item.tips && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Tip:</span> {item.tips}
                </p>
              </div>
            )}

            {item.documentsNeeded.length > 0 && (
              <DocumentChecklist documents={item.documentsNeeded} />
            )}

            {item.actionUrl && (
              <a href={item.actionUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  {item.actionLabel ?? 'Open Link'}
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

  // Get enabled techs with their data
  const enabledTechs = useMemo(
    () => recommendations.filter((r) => enabledTechIds.has(r.techId)),
    [recommendations, enabledTechIds],
  );

  // Determine which schemes we need action plans for
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

    // Only fetch schemes we don't have yet
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

  // Build the curated plan
  const phases = useMemo(
    () => buildCuratedPlan(enabledTechs, schemeStepsMap),
    [enabledTechs, schemeStepsMap],
  );

  // Consolidated document list
  const allDocuments = useMemo(() => {
    const docs = new Set<string>();
    for (const phase of phases) {
      for (const item of phase.items) {
        if (!item.isReference) {
          for (const doc of item.documentsNeeded) docs.add(doc);
        }
      }
    }
    return Array.from(docs);
  }, [phases]);

  // Tech-to-scheme mapping for summary
  const techSchemeMap = useMemo(() => {
    const map: { tech: TechWithFunding; scheme: FundingMatch }[] = [];
    for (const tech of enabledTechs) {
      const scheme = pickBestScheme(tech);
      if (scheme) map.push({ tech, scheme });
    }
    return map;
  }, [enabledTechs]);

  /* ---------------------------------------------------------------- */
  /*  No recommendations data — show CTA                               */
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

  if (loading && phases.length === 0) {
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
  /*  Render curated plan                                              */
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
            Personalised for your {enabledTechs.length} selected {enabledTechs.length === 1 ? 'technology' : 'technologies'},
            matched with {techSchemeMap.length > 0 ? new Set(techSchemeMap.map((m) => m.scheme.schemeId)).size : 0} funding {new Set(techSchemeMap.map((m) => m.scheme.schemeId)).size === 1 ? 'scheme' : 'schemes'}
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

      {/* Phased action plan */}
      {phases.map((phase, phaseIndex) => {
        const PhaseIcon = PHASE_ICONS[phase.icon];
        return (
          <Card key={phase.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <PhaseIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Phase {phaseIndex + 1}: {phase.title}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {phase.items.filter((i) => !i.isReference).length} {phase.items.filter((i) => !i.isReference).length === 1 ? 'step' : 'steps'}
                    {phase.items.some((i) => i.isReference) && ` (${phase.items.filter((i) => i.isReference).length} already covered)`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {phase.items.map((item, i) => (
                  <PhaseItemCard
                    key={`${item.schemeId}-${item.title}-${i}`}
                    item={item}
                    isLast={i === phase.items.length - 1}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

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

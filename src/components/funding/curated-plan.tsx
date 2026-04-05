'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWhatIfStore } from '@/lib/what-if-store';
import type { TechWithFunding, FundingMatch } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Check,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Target,
} from 'lucide-react';
import {
  type EligibilityAnswers,
  type OrgContextProp,
  type EligibilityResult,
  type SchemeEligibility,
  type SchemeCriterion,
  type CriterionStatus,
  type Verdict,
  loadEligibility,
  saveEligibility,
  evaluateAllSchemes,
  getCompletionPct,
} from './eligibility-engine';
import { EligibilityQuestionnaire } from './eligibility-questionnaire';

import { cn } from '@/lib/utils';
import { PlanCostSummary } from './plan-cost-summary';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A scheme section in the curated plan — now driven by eligibility criteria */
interface SchemeSection {
  schemeId: string;
  schemeName: string;
  schemeAgency: string;
  supportType: string;
  status: string;
  applicationUrl: string | null;
  techNames: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/** Pick the best funding scheme for a technology, skipping hard-blocked schemes */
function pickBestScheme(
  tech: TechWithFunding,
  schemeEligMap?: Map<string, SchemeEligibility>,
): FundingMatch | null {
  // Filter out hard-blocked schemes so techs always land on a visible card
  const eligible = schemeEligMap
    ? tech.fundingMatches.filter((m) => schemeEligMap.get(m.schemeId)?.verdict !== 'hard_block')
    : tech.fundingMatches;

  const active = eligible.filter((m) => m.status === 'Active');
  if (active.length === 0) return eligible[0] ?? null;

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
/*  Build scheme sections — grouped by best scheme, priority ordered    */
/* ------------------------------------------------------------------ */

function buildSchemeSections(
  enabledTechs: TechWithFunding[],
  schemeEligMap: Map<string, SchemeEligibility>,
): SchemeSection[] {
  // 1. Group techs by best scheme
  const techsByScheme = new Map<string, { techs: TechWithFunding[]; scheme: FundingMatch }>();

  for (const tech of enabledTechs) {
    const bestScheme = pickBestScheme(tech, schemeEligMap);
    if (!bestScheme) continue;

    const existing = techsByScheme.get(bestScheme.schemeId);
    if (existing) {
      existing.techs.push(tech);
    } else {
      techsByScheme.set(bestScheme.schemeId, { techs: [tech], scheme: bestScheme });
    }
  }

  // 2. Process schemes in priority order
  const schemeOrder = ['S001', 'S011', 'S006', 'S004', 'S003', 'S002', 'S010', 'S008', 'S012', 'S009', 'S007'];
  const sortedSchemeIds = Array.from(techsByScheme.keys()).sort((a, b) => {
    const ia = schemeOrder.indexOf(a);
    const ib = schemeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const sections: SchemeSection[] = [];
  for (const sid of sortedSchemeIds) {
    const group = techsByScheme.get(sid)!;
    const se = schemeEligMap.get(sid);

    sections.push({
      schemeId: sid,
      schemeName: se?.schemeName ?? group.scheme.name,
      schemeAgency: group.scheme.implementingAgency ?? '',
      supportType: group.scheme.supportType ?? '',
      status: group.scheme.status,
      applicationUrl: group.scheme.applicationUrl ?? null,
      techNames: group.techs.map((t) => t.name),
    });
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Criteria scorecard — auto-evaluated per scheme                     */
/* ------------------------------------------------------------------ */

const CRITERION_ICONS: Record<CriterionStatus, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: 'text-emerald-500' },
  fail: { icon: XCircle, className: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  unknown: { icon: AlertCircle, className: 'text-muted-foreground/50' },
};

/* ------------------------------------------------------------------ */
/*  Consolidated actions — deduplicated across all schemes              */
/* ------------------------------------------------------------------ */

interface ConsolidatedAction {
  /** Dedup key (e.g. "hasUdyam", "isNpa", or a normalised label) */
  key: string;
  label: string;
  status: CriterionStatus;
  severity?: 'soft' | 'hard';
  detail?: string;
  detailUrl?: string;
  detailLabel?: string;
  group: 'scheme' | 'financial' | 'other';
  /** Scheme names this action affects */
  schemeNames: string[];
}

/** Build deduplicated action list from all scheme criteria */
function buildConsolidatedActions(
  schemeResults: SchemeEligibility[],
): ConsolidatedAction[] {
  const actionMap = new Map<string, ConsolidatedAction>();

  for (const sr of schemeResults) {
    for (const c of sr.criteria) {
      // Only actionable items (not pass)
      if (c.status === 'pass') continue;
      // Skip hard blocks with no fix (e.g. location, sector) — scheme card shows "Not Eligible"
      if (c.severity === 'hard') continue;

      // Dedup by field name (e.g. 'hasEnergyAudit') when available, otherwise normalise label
      const key = c.field ?? normaliseActionKey(c.label);
      const existing = actionMap.get(key);

      if (existing) {
        // Merge: add scheme name, escalate severity
        if (!existing.schemeNames.includes(sr.schemeName)) {
          existing.schemeNames.push(sr.schemeName);
        }
        // Escalate: warning > unknown
        if (c.status === 'warning' && existing.status === 'unknown') existing.status = 'warning';
        // Use longest detail
        if (c.detail && (!existing.detail || c.detail.length > existing.detail.length)) {
          existing.detail = c.detail;
          existing.detailUrl = c.detailUrl;
          existing.detailLabel = c.detailLabel;
        }
      } else {
        actionMap.set(key, {
          key,
          label: c.label,
          status: c.status,
          severity: c.severity,
          detail: c.detail,
          detailUrl: c.detailUrl,
          detailLabel: c.detailLabel,
          group: (c.group as 'scheme' | 'financial') ?? 'other',
          schemeNames: [sr.schemeName],
        });
      }
    }
  }

  // Sort: fail first, then warning, then unknown; within each group, more schemes affected first
  const statusOrder: Record<string, number> = { fail: 0, warning: 1, unknown: 2 };
  return Array.from(actionMap.values()).sort((a, b) => {
    const sa = statusOrder[a.status] ?? 3;
    const sb = statusOrder[b.status] ?? 3;
    if (sa !== sb) return sa - sb;
    return b.schemeNames.length - a.schemeNames.length;
  });
}

/** Normalise action labels so duplicates match across schemes */
function normaliseActionKey(label: string): string {
  // Strip scheme-specific prefixes and state names for matching
  return label
    .replace(/ADEETIE|BEE-GEF-UNIDO|SIDBI PRSF|SIDBI 4E|CLCS-TUS|MSE-GIFT|IREDA|ZED|SATAT|EESL/g, '')
    .replace(/\([^)]*auto-detected[^)]*\)/g, '')
    .replace(/\([^)]*your (state|sector)[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ConsolidatedActionsCard({ actions }: { actions: ConsolidatedAction[] }) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All clear — no actions needed</p>
          <p className="text-[11px] text-muted-foreground mt-1">You meet all criteria for your matched schemes.</p>
        </CardContent>
      </Card>
    );
  }

  const schemeActions = actions.filter((a) => a.group === 'scheme');
  const financialActions = actions.filter((a) => a.group === 'financial');
  const otherActions = actions.filter((a) => a.group === 'other');

  const groups: { label: string; items: ConsolidatedAction[] }[] = [];
  if (schemeActions.length > 0) groups.push({ label: 'Scheme Eligibility', items: schemeActions });
  if (financialActions.length > 0) groups.push({ label: 'Financial Profile', items: financialActions });
  if (otherActions.length > 0) groups.push({ label: 'Other', items: otherActions });

  let runningIndex = 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base font-semibold">Actions Needed</CardTitle>
          <Badge variant="outline" className="text-[10px]">{actions.length} {actions.length === 1 ? 'item' : 'items'}</Badge>
        </div>
        <CardDescription className="text-[11px]">
          Resolve these to unlock funding for your selected technologies. Each action may unblock multiple schemes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              {groups.length > 1 && (
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((action) => {
                  runningIndex++;
                  const { icon: Icon, className: iconClass } = CRITERION_ICONS[action.status];
                  return (
                    <div key={action.key} className="rounded-md border border-border px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <span className="text-[10px] text-muted-foreground/50 font-mono w-4 text-right">{runningIndex}.</span>
                          <Icon className={cn('h-3.5 w-3.5', iconClass)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={cn(
                            'text-xs font-medium',
                            action.status === 'fail' && 'text-red-700 dark:text-red-400',
                            action.status === 'warning' && 'text-amber-700 dark:text-amber-400',
                            action.status === 'unknown' && 'text-muted-foreground',
                          )}>
                            {action.label}
                            {action.status === 'unknown' && ' — answer in eligibility check above'}
                          </span>
                          {action.detail && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{action.detail}</p>
                          )}
                          {action.detailUrl && (
                            <a href={action.detailUrl} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-primary underline mt-0.5 inline-block"
                              onClick={(e) => e.stopPropagation()}>
                              {action.detailLabel ?? 'Learn more'}
                            </a>
                          )}
                          {/* Schemes affected */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-[10px] text-muted-foreground/70">Affects:</span>
                            {action.schemeNames.map((name) => (
                              <Badge key={name} variant="outline" className="text-[9px] py-0 px-1.5 font-normal text-muted-foreground">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Compact criteria scorecard — per scheme (no repeated detail)        */
/* ------------------------------------------------------------------ */

function CriteriaScorecard({ criteria, applicationUrl }: { criteria: SchemeCriterion[]; applicationUrl?: string | null }) {
  if (criteria.length === 0) {
    return (
      <div className="text-[11px] text-muted-foreground italic py-2">
        No specific eligibility criteria — generally available to all MSMEs.
      </div>
    );
  }

  const passCount = criteria.filter((c) => c.status === 'pass').length;
  const failCount = criteria.filter((c) => c.status === 'fail').length;
  const warnCount = criteria.filter((c) => c.status === 'warning').length;
  const unknownCount = criteria.filter((c) => c.status === 'unknown').length;
  const total = criteria.length;
  const progressPct = total > 0 ? Math.round((passCount / total) * 100) : 0;

  return (
    <div className="space-y-2.5">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {passCount}/{total} criteria met
          </span>
          <div className="flex items-center gap-2">
            {warnCount > 0 && <span className="text-amber-600 dark:text-amber-400">{warnCount} needs action</span>}
            {failCount > 0 && <span className="text-red-600 dark:text-red-400">{failCount} blocked</span>}
            {unknownCount > 0 && <span className="text-muted-foreground">{unknownCount} pending</span>}
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              failCount > 0 ? 'bg-red-500' : warnCount > 0 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Compact criteria list — just labels + icons, details are in consolidated card */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {criteria.map((c, i) => {
          const { icon: Icon, className: iconClass } = CRITERION_ICONS[c.status];
          return (
            <div key={i} className="flex items-center gap-1">
              <Icon className={cn('h-3 w-3', iconClass)} />
              <span className={cn(
                'text-[11px]',
                c.status === 'pass' && 'text-foreground',
                c.status === 'fail' && 'text-red-700 dark:text-red-400',
                c.status === 'warning' && 'text-amber-700 dark:text-amber-400',
                c.status === 'unknown' && 'text-muted-foreground',
              )}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Apply button — only when no hard blocks */}
      {failCount === 0 && applicationUrl && (
        <a href={applicationUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="default" size="sm" className="gap-1.5 text-xs mt-1">
            <ExternalLink className="h-3 w-3" />
            Apply Now
          </Button>
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verdict badge                                                      */
/* ------------------------------------------------------------------ */

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  switch (verdict) {
    case 'eligible':
      return (
        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1">
          <Check className="h-3 w-3" /> Eligible
        </Badge>
      );
    case 'soft_block':
      return (
        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
          <AlertTriangle className="h-3 w-3" /> Fix Required
        </Badge>
      );
    case 'hard_block':
      return (
        <Badge variant="outline" className="text-[10px] border-red-500 text-red-600 dark:text-red-400 gap-1">
          <XCircle className="h-3 w-3" /> Not Eligible
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CuratedPlan({ className, orgContext }: { className?: string; orgContext?: OrgContextProp | null }) {
  const recommendations = useWhatIfStore((s) => s.recommendations);
  const enabledTechIds = useWhatIfStore((s) => s.enabledTechIds);
  const combinedImpact = useWhatIfStore((s) => s.combinedImpact);
  const periodId = useWhatIfStore((s) => s.periodId);

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

  // (schemeGroups now derived from sortedSections — see eligibleSchemeGroups below)


  // ── Eligibility state ──
  const [eligAnswers, setEligAnswers] = useState<EligibilityAnswers>(() => loadEligibility());
  const [showQuestionnaire, setShowQuestionnaire] = useState(() => loadEligibility().hasUdyam === null);

  const updateAnswers = useCallback((newAnswers: EligibilityAnswers) => {
    setEligAnswers(newAnswers);
    saveEligibility(newAnswers);
  }, []);

  // Tech type flags
  const hasEETechs = enabledTechs.some((t) =>
    ['T001','T002','T003','T004','T005','T006','T007','T008','T009','T012','T014'].includes(t.techId),
  );
  const hasRETechs = enabledTechs.some((t) =>
    ['T015','T016','T017','T018'].includes(t.techId),
  );
  const hasBioTechs = enabledTechs.some((t) =>
    ['T020','T021'].includes(t.techId),
  );
  const hasGasTechs = enabledTechs.some((t) =>
    ['T019'].includes(t.techId),
  );

  // Compute eligibility — now returns criteria per scheme
  const eligResult: EligibilityResult = useMemo(
    () => evaluateAllSchemes(eligAnswers, orgContext ?? null, Array.from(neededSchemeIds), hasEETechs, hasRETechs),
    [eligAnswers, orgContext, neededSchemeIds, hasEETechs, hasRETechs],
  );

  const completionPct = useMemo(
    () => getCompletionPct(eligAnswers, { hasEETechs, hasRETechs, hasGasTechs }),
    [eligAnswers, hasEETechs, hasRETechs, hasGasTechs],
  );

  // Find scheme eligibility by ID
  const schemeEligMap = useMemo(() => {
    const map = new Map<string, SchemeEligibility>();
    for (const r of eligResult.schemeResults) map.set(r.schemeId, r);
    return map;
  }, [eligResult]);

  // Build scheme sections (criteria-driven, no action plan steps needed)
  const sections = useMemo(
    () => buildSchemeSections(enabledTechs, schemeEligMap),
    [enabledTechs, schemeEligMap],
  );

  // Filter out hard-blocked schemes and sort: eligible first, then soft_block
  const sortedSections = useMemo(() => {
    const order: Record<string, number> = { eligible: 0, soft_block: 1 };
    return [...sections]
      .filter((s) => {
        const verdict = schemeEligMap.get(s.schemeId)?.verdict;
        return verdict !== 'hard_block';
      })
      .sort((a, b) => {
        const va = schemeEligMap.get(a.schemeId)?.verdict ?? 'eligible';
        const vb = schemeEligMap.get(b.schemeId)?.verdict ?? 'eligible';
        return (order[va] ?? 0) - (order[vb] ?? 0);
      });
  }, [sections, schemeEligMap]);

  // Count techs that actually appear under visible scheme cards
  const visibleTechCount = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sortedSections) {
      for (const name of s.techNames) ids.add(name);
    }
    return ids.size;
  }, [sortedSections]);

  // Summary groups — derived from sortedSections so techs map to non-hard-blocked schemes
  const eligibleSchemeGroups = useMemo(() => {
    const techByName = new Map<string, TechWithFunding>();
    for (const t of enabledTechs) techByName.set(t.name, t);

    return sortedSections.map((s) => {
      const firstTech = techByName.get(s.techNames[0]);
      const scheme = firstTech?.fundingMatches.find((m) => m.schemeId === s.schemeId)
        ?? { schemeId: s.schemeId, name: s.schemeName, supportType: s.supportType, status: s.status } as FundingMatch;
      return {
        scheme,
        techs: s.techNames.map((n) => techByName.get(n)).filter(Boolean) as TechWithFunding[],
      };
    });
  }, [sortedSections, enabledTechs]);

  // Consolidated actions — deduplicated across all schemes
  const consolidatedActions = useMemo(
    () => buildConsolidatedActions(eligResult.schemeResults),
    [eligResult.schemeResults],
  );

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

  // (sortedSections, visibleTechCount, eligibleSchemeGroups, consolidatedActions moved before early returns)
  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── 1. Eligibility Questionnaire ── */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setShowQuestionnaire(!showQuestionnaire)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Eligibility Check</CardTitle>
              {completionPct === 100 && (
                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">Complete</Badge>
              )}
            </div>
            {showQuestionnaire ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <CardDescription className="text-[11px]">
            Answer a few questions to check which schemes you qualify for
          </CardDescription>
        </CardHeader>
        {showQuestionnaire && (
          <CardContent>
            <EligibilityQuestionnaire
              answers={eligAnswers}
              onChange={updateAnswers}
              orgContext={orgContext ?? null}
              hasEETechs={hasEETechs}
              hasRETechs={hasRETechs}
              hasBioTechs={hasBioTechs}
              hasGasTechs={hasGasTechs}
              completionPct={completionPct}
            />
          </CardContent>
        )}
      </Card>

      {/* Eligibility summary integrated into scheme cards below */}

      {/* ── 4. Summary header (scheme groups + KPIs) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              Your Curated Action Plan
            </CardTitle>
          </div>
          <CardDescription className="text-[11px]">
            {visibleTechCount} of {recommendations.length} technologies active
            ({recommendations.length - enabledTechs.length} are alternatives in the same group, e.g. renewable electricity options)
            {' '}&middot; matched with {eligibleSchemeGroups.length} funding {eligibleSchemeGroups.length === 1 ? 'scheme' : 'schemes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eligibleSchemeGroups.map(({ scheme, techs }) => {
              const se = schemeEligMap.get(scheme.schemeId);
              return (
                <div key={scheme.schemeId} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{scheme.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{scheme.supportType}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {se && <VerdictBadge verdict={se.verdict} />}
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px]',
                          scheme.status === 'Active'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-amber-500 text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {scheme.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {techs.map((tech) => (
                      <Badge key={tech.techId} variant="outline" className="text-[10px] py-0.5 px-2 font-normal">
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

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

      {/* ── 5. Consolidated actions — deduplicated across schemes ── */}
      <ConsolidatedActionsCard actions={consolidatedActions} />

      {/* ── 6. All scheme sections — unified, sorted by eligibility ── */}
      {sortedSections.map((section, sectionIndex) => {
        const se = schemeEligMap.get(section.schemeId);
        const verdict = se?.verdict ?? 'eligible';
        const borderClass = verdict === 'hard_block' ? 'border-red-200 dark:border-red-800 opacity-75'
          : verdict === 'soft_block' ? 'border-amber-200 dark:border-amber-800' : '';
        const badgeColor = verdict === 'eligible' ? 'bg-emerald-500'
          : verdict === 'soft_block' ? 'bg-amber-500' : 'bg-red-500';

        return (
          <Card key={section.schemeId} className={borderClass}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white', badgeColor)}>
                      {sectionIndex + 1}
                    </span>
                    {section.schemeName}
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-1">
                    {section.supportType}{section.schemeAgency ? ` — ${section.schemeAgency}` : ''}
                  </CardDescription>
                </div>
                <VerdictBadge verdict={verdict} />
              </div>
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
              <CriteriaScorecard
                criteria={se?.criteria ?? []}
                applicationUrl={verdict !== 'hard_block' ? section.applicationUrl : undefined}
              />
            </CardContent>
          </Card>
        );
      })}

      {/* ── 7. Cost breakdown ── */}
      <PlanCostSummary
        techs={enabledTechs}
        pickBestScheme={pickBestScheme}
      />
    </div>
  );
}

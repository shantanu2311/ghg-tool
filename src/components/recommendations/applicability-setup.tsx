'use client';

import { useState, useCallback, useEffect } from 'react';
import type { TechWithFunding } from '@/lib/rec-engine/types';
import { LEVER_GROUPS, TECH_TO_LEVER, pickRecommended } from '@/lib/rec-engine/lever-groups';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Settings2, ArrowRight, Star, AlertTriangle, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  recommendations: TechWithFunding[];
  baselineTotal: number;
  onComplete: (applicableTechIds: Set<string>, implPcts: Record<string, number>) => void;
}

/** Facility-specific context for the implementation slider */
const IMPL_CONTEXT: Record<string, string> = {
  T001: 'of furnace recovered',
  T002: 'of furnace insulated',
  T003: 'of facility lighting',
  T004: 'of motors in facility',
  T005: 'of eligible drives',
  T006: 'of compressed air system',
  T007: 'ISO 50001 coverage',
  T008: 'of power factor corrected',
  T009: 'of furnace upgraded',
  T010: 'of scrap preheated',
  T011: 'cluster participation',
  T012: 'of furnace upgraded to IGBT',
  T013: 'of kiln insulated',
  T014: 'of heat treatment upgraded',
  T015: 'of roof area with solar',
  T016: 'via RESCO PPA',
  T017: 'from green open access',
  T018: 'with BESS + solar',
  T019: 'converted to PNG',
  T020: 'using biomass briquettes',
  T021: 'using CBG',
  T022: 'with solar thermal',
  T023: 'electrified',
};

/* ------------------------------------------------------------------ */
/*  Lever Group Advisor — inline questions + auto-selection             */
/* ------------------------------------------------------------------ */

interface LeverAnswers {
  // Renewable Electricity
  roofSpace: 'large' | 'small' | 'none' | null;
  budgetPref: 'own' | 'zero_upfront' | 'need_backup' | null;
  monthlyBill: 'under_5l' | '5_to_20l' | 'over_20l' | null;
  // Fuel Switching
  pngAccess: 'connected' | 'available' | 'no' | null;
  biomassAvailable: 'yes' | 'no' | null;
  // Process Heat
  processTemp: 'below_250' | 'above_250' | null;
}

const LEVER_ANSWERS_KEY = 'ghg-lever-answers';

function loadLeverAnswers(): LeverAnswers {
  if (typeof window === 'undefined') return { roofSpace: null, budgetPref: null, monthlyBill: null, pngAccess: null, biomassAvailable: null, processTemp: null };
  try {
    const raw = localStorage.getItem(LEVER_ANSWERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { roofSpace: null, budgetPref: null, monthlyBill: null, pngAccess: null, biomassAvailable: null, processTemp: null };
}

function saveLeverAnswers(a: LeverAnswers) {
  try { localStorage.setItem(LEVER_ANSWERS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

/** Decide best RE tech based on answers */
function pickRETech(a: LeverAnswers, available: Set<string>): { techId: string; reason: string } | null {
  if (a.roofSpace === 'none') {
    if (available.has('T017') && (a.monthlyBill === '5_to_20l' || a.monthlyBill === 'over_20l')) {
      return { techId: 'T017', reason: 'No roof space → off-site renewable electricity via open access' };
    }
    if (available.has('T016')) return { techId: 'T016', reason: 'No roof space — consider RESCO model (developer installs on your roof at no cost) if some roof is available, or open access for larger demand' };
    return null;
  }
  if (a.budgetPref === 'need_backup' && available.has('T018')) {
    return { techId: 'T018', reason: 'Need backup power → BESS + Solar provides storage for outages + peak shaving' };
  }
  if (a.budgetPref === 'zero_upfront' && available.has('T016')) {
    return { techId: 'T016', reason: 'Zero upfront cost → RESCO/PPA model (developer installs and maintains, you pay per unit)' };
  }
  if (a.budgetPref === 'own' && available.has('T015')) {
    return { techId: 'T015', reason: 'Own the system → Rooftop Solar CAPEX (you invest, you own, best long-term returns)' };
  }
  // Default if roof exists but no budget preference yet
  if (a.roofSpace && available.has('T015')) {
    return { techId: 'T015', reason: 'Roof available → Solar CAPEX gives best long-term ROI' };
  }
  return null;
}

/** Decide best fuel switching tech */
function pickFuelTech(a: LeverAnswers, available: Set<string>): { techId: string; reason: string } | null {
  if ((a.pngAccess === 'connected' || a.pngAccess === 'available') && available.has('T019')) {
    return { techId: 'T019', reason: a.pngAccess === 'connected' ? 'PNG pipeline connected → cleanest fossil fuel switch' : 'PNG available nearby → apply for connection, then switch' };
  }
  if (a.pngAccess === 'no' && a.biomassAvailable === 'yes' && available.has('T020')) {
    return { techId: 'T020', reason: 'No PNG + biomass available → briquettes are locally sourced and cost-effective' };
  }
  if (a.pngAccess === 'no' && a.biomassAvailable === 'no' && available.has('T021')) {
    return { techId: 'T021', reason: 'No PNG, no local biomass → CBG (compressed biogas) via SATAT network' };
  }
  if (a.pngAccess === 'no' && available.has('T020')) {
    return { techId: 'T020', reason: 'No PNG → biomass briquettes widely available in agricultural states' };
  }
  return null;
}

/** Decide best process heat tech */
function pickHeatTech(a: LeverAnswers, available: Set<string>): { techId: string; reason: string } | null {
  if (a.processTemp === 'below_250' && available.has('T022')) {
    return { techId: 'T022', reason: 'Process temp below 250°C → solar thermal is viable and cost-effective' };
  }
  if (a.processTemp === 'above_250' && available.has('T023')) {
    return { techId: 'T023', reason: 'High-temperature process → electrification with induction/resistance heating' };
  }
  return null;
}

function getAdvisedTech(lever: string, answers: LeverAnswers, available: Set<string>): { techId: string; reason: string } | null {
  switch (lever) {
    case 'renewable_electricity': return pickRETech(answers, available);
    case 'fuel_switching': return pickFuelTech(answers, available);
    case 'process_heat': return pickHeatTech(answers, available);
    default: return null;
  }
}

interface QuestionDef {
  key: keyof LeverAnswers;
  label: string;
  options: { value: string; label: string }[];
}

const LEVER_QUESTIONS: Record<string, QuestionDef[]> = {
  renewable_electricity: [
    { key: 'roofSpace', label: 'Do you have usable roof space?', options: [
      { value: 'large', label: 'Yes, large (>500 sqm)' },
      { value: 'small', label: 'Yes, small (<500 sqm)' },
      { value: 'none', label: 'No roof space' },
    ]},
    { key: 'budgetPref', label: 'Your preference for solar?', options: [
      { value: 'own', label: 'Own the system (invest & own)' },
      { value: 'zero_upfront', label: 'Zero upfront (pay per unit)' },
      { value: 'need_backup', label: 'Need backup power too' },
    ]},
    { key: 'monthlyBill', label: 'Monthly electricity bill?', options: [
      { value: 'under_5l', label: 'Under ₹5 Lakhs' },
      { value: '5_to_20l', label: '₹5–20 Lakhs' },
      { value: 'over_20l', label: 'Over ₹20 Lakhs' },
    ]},
  ],
  fuel_switching: [
    { key: 'pngAccess', label: 'PNG (piped natural gas) access?', options: [
      { value: 'connected', label: 'Connected' },
      { value: 'available', label: 'Available nearby' },
      { value: 'no', label: 'Not available' },
    ]},
    { key: 'biomassAvailable', label: 'Biomass/agri-waste available locally?', options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ]},
  ],
  process_heat: [
    { key: 'processTemp', label: 'Maximum process heat temperature?', options: [
      { value: 'below_250', label: 'Below 250°C' },
      { value: 'above_250', label: 'Above 250°C' },
    ]},
  ],
};

function LeverGroupAdvisor({
  lever,
  answers,
  onChange,
  availableTechIds,
  onAdvise,
}: {
  lever: string;
  answers: LeverAnswers;
  onChange: (a: LeverAnswers) => void;
  availableTechIds: Set<string>;
  onAdvise: (techId: string | null) => void;
}) {
  const questions = LEVER_QUESTIONS[lever];
  if (!questions) return null;

  const advised = getAdvisedTech(lever, answers, availableTechIds);

  // Notify parent when advice changes
  useEffect(() => {
    onAdvise(advised?.techId ?? null);
  }, [advised?.techId, onAdvise]);

  const hasAnyAnswer = questions.some((q) => answers[q.key] !== null);

  return (
    <div className="px-4 py-3 space-y-3 bg-blue-50/50 dark:bg-blue-950/10 border-b border-blue-200/30 dark:border-blue-900/20">
      <div className="flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <p className="text-[11px] font-medium text-blue-800 dark:text-blue-300">Help us pick the best option for you</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {questions.map((q) => (
          <div key={q.key}>
            <p className="text-[11px] font-medium text-foreground mb-1">{q.label}</p>
            <div className="flex flex-wrap gap-1">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = { ...answers, [q.key]: answers[q.key] === opt.value ? null : opt.value };
                    onChange(next);
                  }}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded-full border transition-colors',
                    answers[q.key] === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50 text-muted-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasAnyAnswer && advised && (
        <div className="flex items-start gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 px-3 py-2">
          <Star className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Recommended:</span> {advised.reason}
          </p>
        </div>
      )}
    </div>
  );
}

export function ApplicabilitySetup({ recommendations, baselineTotal, onComplete }: Props) {
  // Start with NOTHING selected — user opts in
  const [applicable, setApplicable] = useState<Set<string>>(() => new Set());
  const [implPcts, setImplPcts] = useState<Record<string, number>>({});
  const [leverAnswers, setLeverAnswers] = useState<LeverAnswers>(() => loadLeverAnswers());

  const updateLeverAnswers = useCallback((a: LeverAnswers) => {
    setLeverAnswers(a);
    saveLeverAnswers(a);
  }, []);

  // Auto-select advised tech in a lever group (deselect siblings)
  const handleAdvise = useCallback((lever: string, techId: string | null) => {
    if (!techId) return;
    setApplicable((prev) => {
      const group = LEVER_GROUPS.find((g) => g.lever === lever);
      if (!group) return prev;
      const next = new Set(prev);
      // Remove all siblings in this group
      for (const tid of group.techIds) next.delete(tid);
      // Add advised tech
      next.add(techId);
      return next;
    });
  }, []);

  const toggleApplicable = useCallback((techId: string) => {
    setApplicable((prev) => {
      const next = new Set(prev);
      if (next.has(techId)) {
        next.delete(techId);
        setImplPcts((p) => { const n = { ...p }; delete n[techId]; return n; });
      } else {
        next.add(techId);
      }
      return next;
    });
  }, []);

  const setImpl = useCallback((techId: string, pct: number) => {
    setImplPcts((prev) => {
      if (pct <= 0) { const n = { ...prev }; delete n[techId]; return n; }
      return { ...prev, [techId]: pct };
    });
  }, []);

  const selectAll = useCallback(() => {
    const selected = new Set<string>();
    // For lever groups, only select the recommended (best) option
    for (const group of LEVER_GROUPS) {
      const groupTechs = recommendations.filter((r) => group.techIds.includes(r.techId));
      if (groupTechs.length > 0) {
        const best = pickRecommended(groupTechs);
        if (best) selected.add(best);
      }
    }
    // Add all independent techs
    for (const r of recommendations) {
      if (!TECH_TO_LEVER[r.techId]) selected.add(r.techId);
    }
    setApplicable(selected);
  }, [recommendations]);

  const handleSubmit = useCallback(() => {
    onComplete(applicable, implPcts);
  }, [applicable, implPcts, onComplete]);

  // Group techs
  const groupedTechs = new Map<string, TechWithFunding[]>();
  const independentTechs: TechWithFunding[] = [];
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

  // Recommended picks per lever group
  const recommendedByLever = new Map<string, string>();
  for (const [lever, techs] of groupedTechs) {
    const best = pickRecommended(techs);
    if (best) recommendedByLever.set(lever, best);
  }

  const applicableCount = applicable.size;
  const implementedCount = Object.values(implPcts).filter((p) => p > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2.5 shrink-0 mt-0.5">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">What&apos;s applicable to your facility?</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            We matched <span className="font-medium text-foreground">{recommendations.length} technologies</span> to
            your emissions profile ({baselineTotal.toFixed(0)} tCO2e). Select the ones that are relevant to your
            facility, and mark any that you&apos;ve already adopted — partially or fully.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={selectAll} className="shrink-0 text-xs">
          Select All
        </Button>
      </div>

      {/* Lever groups — alternatives, not additive */}
      {LEVER_GROUPS.map((group) => {
        const techs = groupedTechs.get(group.lever);
        if (!techs || techs.length === 0) return null;
        const recommendedId = recommendedByLever.get(group.lever);

        return (
          <Card key={group.lever} className="overflow-hidden">
            <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-200/50 dark:border-amber-900/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
                <p className="text-xs font-semibold text-foreground">{group.label}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 ml-5.5">
                These are <span className="font-medium">alternative approaches</span> — select only the one(s) you&apos;re considering.
                Reductions are <span className="font-medium">not additive</span> across these options.
              </p>
            </div>
            {LEVER_QUESTIONS[group.lever] && (
              <LeverGroupAdvisor
                lever={group.lever}
                answers={leverAnswers}
                onChange={updateLeverAnswers}
                availableTechIds={new Set(techs.map((t) => t.techId))}
                onAdvise={(techId) => handleAdvise(group.lever, techId)}
              />
            )}
            <CardContent className="py-0 divide-y divide-border">
              {techs.map((tech) => {
                const advised = getAdvisedTech(group.lever, leverAnswers, new Set(techs.map((t) => t.techId)));
                const isAdvised = advised?.techId === tech.techId;
                return (
                  <TechRow
                    key={tech.techId}
                    tech={tech}
                    isApplicable={applicable.has(tech.techId)}
                    isRecommended={isAdvised || tech.techId === recommendedId}
                    implPct={implPcts[tech.techId] ?? 0}
                    baselineTotal={baselineTotal}
                    onToggle={() => toggleApplicable(tech.techId)}
                    onImplChange={(pct) => setImpl(tech.techId, pct)}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Independent techs — all can be combined */}
      {independentTechs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/10 border-b border-emerald-200/50 dark:border-emerald-900/30">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              <p className="text-xs font-semibold text-foreground">Energy Efficiency Measures</p>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 ml-5.5">
              These <span className="font-medium">can all be combined</span> — each targets a different part of your operations.
              Reductions are applied sequentially (not simply added).
            </p>
          </div>
          <CardContent className="py-0 divide-y divide-border">
            {independentTechs.map((tech) => (
              <TechRow
                key={tech.techId}
                tech={tech}
                isApplicable={applicable.has(tech.techId)}
                isRecommended={false}
                implPct={implPcts[tech.techId] ?? 0}
                baselineTotal={baselineTotal}
                onToggle={() => toggleApplicable(tech.techId)}
                onImplChange={(pct) => setImpl(tech.techId, pct)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div>
          <p className="text-sm font-medium">
            {applicableCount === 0
              ? 'Select at least one technology to continue'
              : `${applicableCount} technolog${applicableCount === 1 ? 'y' : 'ies'} selected`}
            {implementedCount > 0 && `, ${implementedCount} with existing implementation`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You can fine-tune these later in the what-if simulator
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={applicableCount === 0} className="gap-2">
          View Reduction Potential
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Tech Row ─────────────────────────────────────────────────────────────────

interface TechRowProps {
  tech: TechWithFunding;
  isApplicable: boolean;
  isRecommended: boolean;
  implPct: number;
  baselineTotal: number;
  onToggle: () => void;
  onImplChange: (pct: number) => void;
}

function TechRow({ tech, isApplicable, isRecommended, implPct, onToggle, onImplChange }: TechRowProps) {
  const pctReduction = tech.pctOfTotal;
  const context = IMPL_CONTEXT[tech.techId] ?? 'of facility';

  return (
    <div className={`py-3.5 px-1 transition-colors ${isApplicable ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox-style toggle */}
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            isApplicable
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-muted-foreground/50'
          }`}
        >
          {isApplicable && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{tech.name}</p>
            {isRecommended && (
              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 gap-0.5">
                <Star className="h-2.5 w-2.5" /> Best option
              </Badge>
            )}
          </div>

          {/* Key metrics in a clear grid */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-primary">{pctReduction.toFixed(1)}%</span> of your emissions
            </span>
            {tech.endUseLabel && tech.endUseShare < 1 && (
              <span className="text-[11px] text-muted-foreground/70 italic">
                ({tech.endUseLabel})
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {tech.reductionMinTonnes.toFixed(0)}–{tech.reductionMaxTonnes.toFixed(0)} tCO2e/yr
            </span>
            <span className="text-[11px] text-muted-foreground">
              Payback: {tech.paybackMinYears}–{tech.paybackMaxYears} yrs
            </span>
            {tech.capexMinLakhs != null && tech.capexMinLakhs > 0 && (
              <span className="text-[11px] text-muted-foreground">
                CAPEX: Rs.{tech.capexMinLakhs}–{tech.capexMaxLakhs}L
              </span>
            )}
            {tech.fundingMatches.length > 0 && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {tech.fundingMatches.length} funding scheme{tech.fundingMatches.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Implementation slider — only if selected */}
          {isApplicable && (
            <div className="mt-2.5 rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                What % of your facility already has this?
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={implPct}
                  onChange={(e) => onImplChange(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground w-10 text-right">{implPct}%</span>
              </div>
              {implPct === 0 && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Not yet adopted — full reduction potential available
                </p>
              )}
              {implPct > 0 && implPct < 100 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {implPct}% {context} already done — <span className="font-medium">{100 - implPct}% reduction still available</span>
                </p>
              )}
              {implPct >= 100 && (
                <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Fully adopted — no additional reduction from this technology
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

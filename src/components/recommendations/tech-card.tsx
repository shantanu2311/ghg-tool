'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TechWithFunding } from '@/lib/rec-engine/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Landmark, CheckCircle2, ExternalLink, MapPin, Zap, FlaskConical, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { InfoTip } from '@/components/ui/info-tip';

/** Format tonnes with precision adapted to magnitude — MSMEs often have fractional values */
function fmtTonnes(v: number): string {
  if (v === 0) return '0';
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  if (v >= 0.01) return v.toFixed(2);
  return v.toFixed(4);
}

const CATEGORY_COLORS: Record<string, string> = {
  'Energy Efficiency - Cross Sector': 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'Sector Specific - Iron & Steel': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sector Specific - Brick Kilns': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Sector Specific - Textiles': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Green Electricity': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Alternative Fuels': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const READINESS_BADGE: Record<string, string> = {
  'Commercially mature': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Early commercial': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Emerging': 'bg-muted text-muted-foreground',
};

/** What "% implemented" means for each technology — makes the slider meaningful */
const IMPLEMENTATION_CONTEXT: Record<string, string> = {
  T001: 'of motors fitted with VFDs',
  T002: 'of motors upgraded to IE3/IE4',
  T003: 'of boiler capacity upgraded',
  T004: 'of waste heat being recovered',
  T005: 'of compressed air system optimised',
  T006: 'of lighting converted to LED',
  T007: 'of thermal insulation upgraded',
  T008: 'of EnMS implementation complete',
  T009: 'of cupolas converted to divided blast',
  T010: 'of kilns converted to zig-zag',
  T011: 'of steam load from cogeneration',
  T012: 'of furnaces upgraded to IGBT',
  T013: 'of dye lines with heat recovery',
  T014: 'of sand being reclaimed/recycled',
  T015: 'of electricity from rooftop solar (CAPEX)',
  T016: 'of electricity from rooftop solar (RESCO)',
  T017: 'of electricity from green open access',
  T018: 'of load covered by battery + solar',
  T019: 'of thermal load switched to natural gas',
  T020: 'of coal replaced with biomass briquettes',
  T021: 'of fuel switched to compressed biogas',
  T022: 'of process heat from solar thermal',
  T023: 'of thermal processes electrified',
};

interface Props {
  tech: TechWithFunding;
  enabled: boolean;
  implementedPct: number; // 0 = not implemented, 1-99 = partial, 100 = fully implemented
  onToggle: () => void;
  onImplementedChange: (pct: number) => void;
}

export function TechCard({ tech, enabled, implementedPct, onToggle, onImplementedChange }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const catColor = CATEGORY_COLORS[tech.category] ?? 'bg-muted text-muted-foreground';
  const readinessClass = READINESS_BADGE[tech.technologyReadiness] ?? 'bg-muted text-muted-foreground';

  const isFullyImplemented = implementedPct >= 100;
  const isPartial = implementedPct > 0 && implementedPct < 100;

  return (
    <Card
      className={cn(
        'p-4 transition-[border-color,box-shadow,background-color] duration-200',
        isFullyImplemented
          ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20 opacity-75'
          : enabled
          ? 'border-primary/30 shadow-sm'
          : 'hover:border-border/80',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={cn('text-[10px]', catColor)}>
              {tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}
            </Badge>
            <Badge className={cn('text-[10px]', readinessClass)}>
              {tech.technologyReadiness}
            </Badge>
            {isFullyImplemented && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Implemented
              </Badge>
            )}
            {isPartial && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {implementedPct}% done
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo((v) => !v);
            }}
            className={cn(
              'mt-1.5 text-sm font-semibold leading-tight text-left hover:text-primary transition-colors inline-flex items-center gap-1.5 group',
              isFullyImplemented && 'line-through text-muted-foreground',
            )}
          >
            {tech.name}
            <Info className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
          </button>
        </div>
        <Switch
          size="sm"
          checked={enabled}
          disabled={isFullyImplemented}
          onCheckedChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">CO2 reduction <InfoTip text="Estimated annual emission reduction range if this technology is implemented." /></span>
          <p className="font-medium font-mono tabular-nums">
            {fmtTonnes(tech.reductionMinTonnes)}-{fmtTonnes(tech.reductionMaxTonnes)} t
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Payback <InfoTip text="Estimated time to recover the investment through energy cost savings." /></span>
          <p className="font-medium font-mono tabular-nums">
            {tech.paybackMinYears === 0 && tech.paybackMaxYears === 0
              ? 'Zero upfront'
              : `${tech.paybackMinYears}-${tech.paybackMaxYears} yrs`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">CAPEX <InfoTip text="Estimated capital expenditure in Lakhs (1 Lakh = Rs.1,00,000). Range reflects variation by scale." /></span>
          <p className="font-medium font-mono tabular-nums">
            {tech.capexMinLakhs === null || tech.capexMinLakhs === 0
              ? 'N/A'
              : `Rs.${tech.capexMinLakhs}-${tech.capexMaxLakhs}L`}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Impact on total <InfoTip text="Percentage of your total baseline emissions this technology could eliminate." /></span>
          <p className="font-medium font-mono tabular-nums">{tech.pctOfTotal.toFixed(1)}%</p>
        </div>
      </div>

      {/* ── Expandable Detail Panel (toggled by clicking tech name) ──── */}
      <AnimatePresence initial={false}>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2.5 border-t border-border/50 space-y-3" onClick={(e) => e.stopPropagation()}>
              {/* What is it */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tech.description}
              </p>

              {/* Assumptions table */}
              <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                <div className="px-3 py-1.5 border-b border-border/50">
                  <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Assumptions</p>
                </div>
                <div className="divide-y divide-border/30">
                  <AssumptionRow label="Energy saving" value={`${tech.energySavingMinGj > 0 ? `${tech.energySavingMinGj.toFixed(1)}-${tech.energySavingMaxGj.toFixed(1)} GJ` : `${((tech.reductionMinTonnes / (tech.matchedEmissionsTonnes || 1)) * 100).toFixed(0)}-${((tech.reductionMaxTonnes / (tech.matchedEmissionsTonnes || 1)) * 100).toFixed(0)}%`}`} />
                  <AssumptionRow label="CO2 reduction range" value={`${fmtTonnes(tech.reductionMinTonnes)}-${fmtTonnes(tech.reductionMaxTonnes)} tCO2e/yr`} />
                  <AssumptionRow label="CAPEX range" value={tech.capexMinLakhs != null && tech.capexMinLakhs > 0 ? `Rs.${tech.capexMinLakhs}-${tech.capexMaxLakhs} Lakhs` : 'Minimal / no capital cost'} />
                  <AssumptionRow label="Payback period" value={tech.paybackMinYears === 0 && tech.paybackMaxYears === 0 ? 'Zero upfront cost' : `${tech.paybackMinYears}-${tech.paybackMaxYears} years`} />
                  <AssumptionRow label="Annual savings" value={tech.costSavingMaxInr > 0 ? `Rs.${Math.round(tech.costSavingMinInr).toLocaleString('en-IN')}-${Math.round(tech.costSavingMaxInr).toLocaleString('en-IN')}` : 'Depends on energy prices'} />
                  <AssumptionRow label="Scope addressed" value={tech.scopeAddressed} />
                </div>
              </div>

              {/* Evidence & provenance */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {tech.demonstratedInIndia && (
                  <div className="flex items-center gap-1">
                    <FlaskConical className="h-3 w-3 text-emerald-600" />
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">Demonstrated in India</span>
                  </div>
                )}
                {tech.energyTypeSaved && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{tech.energyTypeSaved} energy</span>
                  </div>
                )}
                {tech.indianClusters && tech.indianClusters.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{tech.indianClusters.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Source attribution */}
              <div className="rounded-md bg-muted/40 px-3 py-2">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/70">Source:</span>{' '}
                  {tech.source}
                </p>
                {tech.sourceUrl && (
                  <a
                    href={tech.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    View reference <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tech.warnings.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 px-2 py-1">
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
          <div>
            {tech.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400">{w}</p>
            ))}
          </div>
        </div>
      )}

      {tech.fundingMatches.length > 0 && (
        <Link
          href="/funding"
          className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <Landmark className="h-3 w-3" />
          {tech.fundingMatches.length} funding scheme{tech.fundingMatches.length > 1 ? 's' : ''} available
          <ArrowRight className="h-2.5 w-2.5 opacity-0 -ml-0.5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
        </Link>
      )}

      {/* Already Implemented */}
      <div
        className="mt-2.5 pt-2 border-t border-border/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Already implemented?
            <InfoTip text="Mark if your facility has already adopted this technology, fully or partially. The reduction potential will be adjusted to reflect only the remaining opportunity." />
          </span>
          <Switch
            size="sm"
            checked={implementedPct > 0}
            onCheckedChange={(checked) => onImplementedChange(checked ? 100 : 0)}
          />
        </div>
        {implementedPct > 0 && (() => {
          const context = IMPLEMENTATION_CONTEXT[tech.techId] ?? 'implemented';
          return (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={10}
                  value={implementedPct}
                  onChange={(e) => onImplementedChange(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-emerald-600 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-foreground w-8 text-right">{implementedPct}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-snug">
                {implementedPct >= 100
                  ? `All ${context} — no remaining reduction potential`
                  : `${implementedPct}% ${context} — ${100 - implementedPct}% reduction still available`}
              </p>
            </div>
          );
        })()}
      </div>
    </Card>
  );
}

/** A single row inside the assumptions mini-table */
function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium font-mono tabular-nums text-foreground">{value}</span>
    </div>
  );
}

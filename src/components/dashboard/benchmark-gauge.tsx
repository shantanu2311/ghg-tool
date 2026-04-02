'use client';

import { useState, useEffect } from 'react';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

interface BenchmarkData {
  bestPractice: number;
  sectorAverage: number;
  worstQuartile: number;
  source: string;
  year: number;
}

interface BenchmarkGaugeProps {
  result: InventoryResult;
  subSector?: string;
}

// Sub-sector label map for display
const SUB_SECTOR_LABELS: Record<string, string> = {
  eaf_mini_mill: 'EAF Mini Mill (Scrap-based)',
  induction_furnace: 'Induction Furnace (Scrap-based)',
  re_rolling: 'Re-Rolling Mill',
  forging: 'Forging Unit',
  casting_foundry: 'Casting / Foundry (IF-based)',
  other: 'Other',
};

// Derivation details per sub-sector
const DERIVATION_DETAILS: Record<string, { scope1: string; scope2: string; assumptions: string[] }> = {
  eaf_mini_mill: {
    scope2: 'SEC 400-650 kWh/t (melting + ladle + casting) x CEA v21.0 grid EF 0.710 tCO2/MWh',
    scope1: 'Electrode consumption (~2-3 kg/t), lime calcination (~20-30 kg/t), oxy-fuel burner if used',
    assumptions: [
      'Scrap-based only (excludes DRI-EAF route)',
      'Scope 2 uses national average grid EF; actual varies by region (0.476-0.898)',
      'Process add-on: 0.03-0.05 tCO2/t for electrodes, lime, oxy-fuel',
    ],
  },
  induction_furnace: {
    scope2: 'SEC 520-870 kWh/t (melting + holding + casting) x 0.710 tCO2/MWh',
    scope1: 'Ladle preheating (5-10 L FO/t), DG set backup, lime additions',
    assumptions: [
      'Scrap feed only. Coal DRI-IF route = 2.30-3.1 tCO2/tcs (not included)',
      'IF lacks refining capability of EAF, hence higher SEC range',
      'Fuel add-on: 0.03-0.08 tCO2/t for ladle heating, DG sets',
    ],
  },
  re_rolling: {
    scope1: 'Fuel SEC 80-200+ kgoe/t in reheating furnace (coal/FO/NG) x ~2.9 tCO2/toe',
    scope2: 'Rolling mill drives: 30-80 kWh/t x 0.710 tCO2/MWh',
    assumptions: [
      'Wide range reflects pusher-type (20-30% efficiency) vs. walking beam furnaces (45-55%)',
      'Thermal benchmark: 270,000 kCal/t (BEE); theoretical minimum: 200,000 kCal/t',
      'Coal consumption: 226-269 kg/t for coal-fired units',
    ],
  },
  forging: {
    scope1: 'FO consumption 0.14-0.18 L/kg product x 0.96 kg/L x 3.15 tCO2/t FO',
    scope2: 'Hammers, presses, induction heating: 40-80 kWh/t x 0.710 tCO2/MWh',
    assumptions: [
      'Assumes furnace oil as primary heating fuel (dominant in Indian forging MSMEs)',
      'Narrower range than re-rolling because forging process is more standardised',
      'Mills switching to induction heating would have different Scope 1/2 split',
    ],
  },
  casting_foundry: {
    scope2: 'Liquid metal SEC 550-850 kWh/t, adjusted for yield loss (55-70%): 786-1545 kWh/t product',
    scope1: 'Sand prep, mould drying, heat treatment: 0.02-0.07 tCO2/t',
    assumptions: [
      'IF-based foundries (83% of Indian production); cupola foundries differ (~0.35-0.55)',
      'Yield loss is biggest factor: investment casting 50-55% vs sand casting 65-70%',
      'Does NOT include upstream metal production (add ~2.0-2.5 tCO2/t for pig iron if Scope 3)',
    ],
  },
};

export default function BenchmarkGauge({ result, subSector }: BenchmarkGaugeProps) {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const intensity = result.intensityMetrics.perProduct;

  useEffect(() => {
    async function loadBenchmarks() {
      try {
        const res = await fetch('/api/benchmarks');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const sector = subSector || 'eaf_mini_mill';
        const intensityBenchmarks = data.filter(
          (b: { subSector: string; metric: string }) => b.subSector === sector && b.metric === 'tCO2e_per_tonne'
        );
        if (intensityBenchmarks.length > 0) {
          const b = intensityBenchmarks[0];
          setBenchmark({
            bestPractice: b.bestPractice,
            sectorAverage: b.sectorAverage,
            worstQuartile: b.worstQuartile,
            source: b.source || '',
            year: b.year || 0,
          });
        }
      } catch {
        // Fall through
      }
    }
    loadBenchmarks();
  }, [subSector]);

  if (intensity == null || !benchmark) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Sector Benchmark <InfoTip text="Compares your emission intensity against Indian Iron & Steel MSME benchmarks derived from BEE, SAMEEEKSHA, and UNIDO studies." /></CardTitle>
        </CardHeader>
        <CardContent>
          {!benchmark ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              Production data required for intensity benchmarking
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const min = 0;
  const max = benchmark.worstQuartile * 1.4;
  const clampedIntensity = Math.min(Math.max(intensity, min), max);
  const pctPosition = ((clampedIntensity - min) / (max - min)) * 100;
  const bestPct = ((benchmark.bestPractice - min) / (max - min)) * 100;
  const avgPct = ((benchmark.sectorAverage - min) / (max - min)) * 100;
  const worstPct = ((benchmark.worstQuartile - min) / (max - min)) * 100;

  function getClassification(val: number): { label: string; color: string } {
    if (val <= benchmark!.bestPractice) return { label: 'Best Practice', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
    if (val <= benchmark!.sectorAverage) return { label: 'Below Average', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
    if (val <= benchmark!.worstQuartile) return { label: 'Above Average', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' };
    return { label: 'Worst Quartile', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
  }

  const classification = getClassification(intensity);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Sector Benchmark <InfoTip text="Compares your emission intensity against Indian Iron & Steel MSME benchmarks derived from BEE, SAMEEEKSHA, and UNIDO studies." /></CardTitle>
        <CardDescription className="text-[11px]">Emission intensity vs Iron &amp; Steel sector</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-2 px-2">
          {/* Gauge bar */}
          <div className="relative h-4 w-full rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="bg-emerald-400" style={{ width: `${bestPct}%` }} />
              <div className="bg-amber-400" style={{ width: `${avgPct - bestPct}%` }} />
              <div className="bg-orange-400" style={{ width: `${worstPct - avgPct}%` }} />
              <div className="bg-red-400 flex-1" />
            </div>
          </div>

          {/* Company marker */}
          <div className="relative mt-1" style={{ height: '28px' }}>
            <div
              className="absolute -top-1 flex flex-col items-center"
              style={{ left: `${pctPosition}%`, transform: 'translateX(-50%)' }}
            >
              <svg width="12" height="16" viewBox="0 0 12 16" className="text-foreground">
                <polygon points="6,0 12,10 0,10" fill="currentColor" />
              </svg>
              <span className="mt-0.5 text-[10px] font-semibold whitespace-nowrap">
                {intensity.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reference labels */}
          <div className="relative mt-2 h-10">
            <div className="absolute text-[10px] text-emerald-700 dark:text-emerald-400" style={{ left: `${bestPct}%`, transform: 'translateX(-50%)' }}>
              <div className="border-l border-border h-2 mx-auto w-0" />
              <span className="whitespace-nowrap">Best ({benchmark.bestPractice})</span>
            </div>
            <div className="absolute text-[10px] text-amber-700 dark:text-amber-400" style={{ left: `${avgPct}%`, transform: 'translateX(-50%)' }}>
              <div className="border-l border-border h-2 mx-auto w-0" />
              <span className="whitespace-nowrap">Avg ({benchmark.sectorAverage})</span>
            </div>
            <div className="absolute text-[10px] text-red-700 dark:text-red-400" style={{ left: `${worstPct}%`, transform: 'translateX(-50%)' }}>
              <div className="border-l border-border h-2 mx-auto w-0" />
              <span className="whitespace-nowrap">Worst ({benchmark.worstQuartile})</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Badge className={classification.color}>
            {classification.label}
          </Badge>
          <span className="ml-2 text-xs text-muted-foreground">
            ({intensity.toFixed(4)} tCO2e/t product)
          </span>
        </div>

        {/* Source attribution + details */}
        {benchmark.source && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Source: {benchmark.source}{benchmark.year ? ` (${benchmark.year})` : ''}. Gate-to-gate (Scope 1+2). Electricity emissions use CEA v21.0 regional grid EF.
            </p>

            {/* Toggle details + download */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showDetails ? 'Hide' : 'View'} derivation details
              </button>
              <span className="text-muted-foreground/30">|</span>
              <a
                href="/api/benchmarks/methodology"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <FileText className="h-3 w-3" />
                Full methodology (PDF)
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            {/* Expandable derivation details */}
            {showDetails && (() => {
              const sectorKey = subSector || 'eaf_mini_mill';
              const details = DERIVATION_DETAILS[sectorKey];
              if (!details) return null;
              return (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 space-y-2.5 text-[11px] leading-relaxed">
                  <div>
                    <p className="font-semibold text-foreground mb-0.5">
                      {SUB_SECTOR_LABELS[sectorKey] || sectorKey}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Scope 1 (Direct):</p>
                    <p className="text-foreground/80">{details.scope1}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Scope 2 (Electricity):</p>
                    <p className="text-foreground/80">{details.scope2}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Key Assumptions:</p>
                    <ul className="mt-0.5 space-y-0.5 text-foreground/70">
                      {details.assumptions.map((a, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground/50 shrink-0">-</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <a
                      href="/api/benchmarks/methodology"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      Download full methodology (PDF)
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

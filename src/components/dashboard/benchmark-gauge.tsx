'use client';

import { useState, useEffect } from 'react';
import type { InventoryResult } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface BenchmarkData {
  bestPractice: number;
  sectorAverage: number;
  worstQuartile: number;
}

interface BenchmarkGaugeProps {
  result: InventoryResult;
  subSector?: string;
}

export default function BenchmarkGauge({ result, subSector }: BenchmarkGaugeProps) {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
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
          <CardTitle className="text-sm font-semibold">Sector Benchmark</CardTitle>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Sector Benchmark</CardTitle>
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
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { RecommendationResult } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowLeft, FileText, FileType, Loader2, Landmark, HandCoins } from 'lucide-react';
import { toast } from 'sonner';

export default function ReductionReportPage() {
  const { periodId } = useParams<{ periodId: string }>();
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!periodId) return;
    fetch(`/api/recommendations/${periodId}`, { method: 'POST' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodId]);

  const handleExport = async (format: 'pdf' | 'word') => {
    if (!data) return;
    setExporting(format);

    const exportPromise = (async () => {
      if (format === 'pdf') {
        const { generateReductionPlanPdf } = await import('@/lib/export/reduction-plan-pdf');
        generateReductionPlanPdf(data);
      } else {
        const { generateReductionPlanWord } = await import('@/lib/export/reduction-plan-word');
        await generateReductionPlanWord(data);
      }
    })();

    toast.promise(exportPromise, {
      loading: `Exporting ${format.toUpperCase()}...`,
      success: `${format.toUpperCase()} exported successfully`,
      error: 'Export failed',
    });

    try {
      await exportPromise;
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm font-medium text-destructive">{error ?? 'No data'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { recommendations, combinedImpact } = data;
  const enabled = recommendations;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emission Reduction Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Exportable summary of matched technologies and projected impact</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/recommendations/${periodId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Simulator
          </Link>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            size="sm"
            className="gap-1.5"
          >
            {exporting === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            Export PDF
          </Button>
          <Button
            onClick={() => handleExport('word')}
            disabled={exporting !== null}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {exporting === 'word' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileType className="h-3 w-3" />}
            Export Word
          </Button>
        </div>
      </div>

      {/* Impact Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Baseline Emissions</p>
              <p className="text-lg font-semibold">{combinedImpact.baselineTotalTonnes.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">tCO2e/year</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Potential Reduction</p>
              <p className="text-lg font-semibold text-primary">{combinedImpact.totalReductionTonnes.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">tCO2e/year ({combinedImpact.totalReductionPct.toFixed(1)}%)</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total CAPEX</p>
              <p className="text-lg font-semibold">
                {combinedImpact.totalCapexMinLakhs > 0
                  ? `Rs.${combinedImpact.totalCapexMinLakhs.toFixed(0)}--${combinedImpact.totalCapexMaxLakhs.toFixed(0)}L`
                  : 'N/A'}
              </p>
              <p className="text-[10px] text-muted-foreground">Lakhs</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Blended Payback</p>
              <p className="text-lg font-semibold">
                {combinedImpact.blendedPaybackYears !== null
                  ? `${combinedImpact.blendedPaybackYears.toFixed(1)} yrs`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Technology Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 pb-2 font-medium">Technology</th>
                  <th className="px-3 pb-2 font-medium">Category</th>
                  <th className="px-3 pb-2 font-medium text-right">Reduction (tCO2e)</th>
                  <th className="px-3 pb-2 font-medium text-right">% of Total</th>
                  <th className="px-3 pb-2 font-medium text-right">CAPEX (Rs.L)</th>
                  <th className="px-3 pb-2 font-medium text-right">Payback (yrs)</th>
                  <th className="px-5 pb-2 font-medium text-right">Funding</th>
                </tr>
              </thead>
              <tbody>
                {enabled.map((tech) => (
                  <tr key={tech.techId} className="border-b border-border last:border-0 even:bg-muted/30">
                    <td className="px-5 py-2.5 font-medium">{tech.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {tech.reductionMinTonnes.toFixed(1)}--{tech.reductionMaxTonnes.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5 text-right">{tech.pctOfTotal.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-right">
                      {tech.capexMinLakhs != null ? `${tech.capexMinLakhs}--${tech.capexMaxLakhs}` : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {tech.paybackMinYears}--{tech.paybackMaxYears}
                    </td>
                    <td className="px-5 py-2.5 text-right text-primary">
                      {tech.fundingMatches.length > 0 ? `${tech.fundingMatches.length} scheme${tech.fundingMatches.length > 1 ? 's' : ''}` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Funding Summary */}
      {enabled.some((t) => t.fundingMatches.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground" />
              Applicable Funding Schemes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const seen = new Set<string>();
                const allFunding = enabled.flatMap((t) =>
                  t.fundingMatches.filter((fm) => {
                    if (seen.has(fm.schemeId)) return false;
                    seen.add(fm.schemeId);
                    return true;
                  }).map((fm) => ({ ...fm, techName: t.name }))
                );
                return allFunding.map((fm) => (
                  <div key={fm.schemeId} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold">{fm.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{fm.implementingAgency}</p>
                      </div>
                      <Badge className={cn('text-[9px]',
                        fm.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}>
                        {fm.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{fm.supportType}</p>
                    {fm.subsidyPct !== null && (
                      <p className="mt-1 text-[11px] font-medium text-primary flex items-center gap-1">
                        <HandCoins className="h-3 w-3" />
                        Subsidy: {fm.subsidyPct}%
                      </p>
                    )}
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waterfall Sequence */}
      {combinedImpact.technologySequence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Reduction Sequence (Sequential Application)</CardTitle>
            <CardDescription className="text-[11px]">
              Technologies applied sequentially to residual emissions (not additive)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-32 text-muted-foreground">Baseline</span>
                <div className="flex-1 h-6 bg-muted rounded" style={{ width: '100%' }} />
                <span className="w-20 text-right font-medium">{combinedImpact.baselineTotalTonnes.toFixed(1)} t</span>
              </div>
              {combinedImpact.technologySequence.map((step, i) => (
                <div key={step.techId} className="flex items-center gap-3 text-xs">
                  <span className="w-32 text-muted-foreground truncate" title={step.name}>
                    {i + 1}. {step.name}
                  </span>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-destructive text-[10px]">-{step.reductionTonnes.toFixed(1)} t</span>
                  </div>
                  <span className="w-20 text-right font-medium">{step.residualAfterTonnes.toFixed(1)} t</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useWizardStore } from '@/lib/store';
import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine/brsr-mapper';
import type { InventoryResult } from '@/lib/calc-engine/types';
import KpiCards from '@/components/dashboard/kpi-cards';
import ScopeChart from '@/components/dashboard/scope-chart';
import TopSources from '@/components/dashboard/top-sources';
import FacilityBreakdown from '@/components/dashboard/facility-breakdown';
import CrossCheckWarnings from '@/components/dashboard/cross-check-warnings';
import BrsrTable from '@/components/dashboard/brsr-table';
import BenchmarkGauge from '@/components/dashboard/benchmark-gauge';
import MonthlyTrend from '@/components/dashboard/monthly-trend';
import PeriodPicker from '@/components/dashboard/period-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileText,
  FileType,
  FileSpreadsheet,
  FileDown,
  BarChart3,
  ArrowRight,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type ExportFormat = 'pdf' | 'word' | 'excel' | 'csv';

interface PeriodMeta {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  organisation: {
    id: string;
    name: string;
    sector: string;
    subSector: string;
  };
}

export default function DashboardPage() {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // Store state — used for just-calculated results
  const storeResult = useWizardStore((s) => s.calculationResult);
  const lastCalculatedPeriodId = useWizardStore((s) => s.lastCalculatedPeriodId);
  const storeOrganisation = useWizardStore((s) => s.organisation);
  const storePeriod = useWizardStore((s) => s.period);

  // API-fetched result for period switching
  const [apiResult, setApiResult] = useState<InventoryResult | null>(null);
  const [apiPeriodMeta, setApiPeriodMeta] = useState<PeriodMeta | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    lastCalculatedPeriodId
  );

  // Determine which result to display
  const isStoreResult = selectedPeriodId === lastCalculatedPeriodId || !selectedPeriodId;
  const result = isStoreResult ? storeResult : apiResult;

  // Org/period metadata for exports
  const orgName = isStoreResult
    ? storeOrganisation.name
    : apiPeriodMeta?.organisation.name ?? '';
  const orgSector = isStoreResult
    ? storeOrganisation.sector
    : apiPeriodMeta?.organisation.sector ?? '';
  const orgState = isStoreResult
    ? storeOrganisation.state
    : '';
  const periodStartDate = isStoreResult
    ? storePeriod.startDate
    : apiPeriodMeta?.startDate ?? '';
  const periodEndDate = isStoreResult
    ? storePeriod.endDate
    : apiPeriodMeta?.endDate ?? '';

  // Fetch result from API when switching to a different period
  useEffect(() => {
    if (!selectedPeriodId || isStoreResult) return;

    let cancelled = false;
    setLoadingResult(true);

    fetch(`/api/results/${selectedPeriodId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const { period: periodData, ...inventoryResult } = data;
        setApiResult(inventoryResult as InventoryResult);
        setApiPeriodMeta(periodData as PeriodMeta);
      })
      .catch(() => {
        if (!cancelled) {
          setApiResult(null);
          setApiPeriodMeta(null);
          toast.error('Failed to load period results');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResult(false);
      });

    return () => { cancelled = true; };
  }, [selectedPeriodId, isStoreResult]);

  const handlePeriodSelect = useCallback((periodId: string) => {
    setSelectedPeriodId(periodId);
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!result) return;
    setExporting(format);

    const exportPromise = (async () => {
      const brsr = mapToBrsr({
        scope1: result.scope1,
        scope2: result.scope2Location,
        scope3: result.scope3,
        biogenicCo2Total: result.biogenicCo2Total,
        energyConsumedGj: result.energyConsumedGj,
        renewablePercent: result.renewablePercent,
        intensityMetrics: result.intensityMetrics,
      });

      const efSources = [...new Set(result.calculations.map((c) => c.efSource))];
      const methodology = generateMethodologyNote({
        gwpReport: result.calculations[0]?.gwpReport ?? 'AR5',
        efSources: efSources.length > 0 ? efSources : ['IPCC 2019 Refinement', 'CEA v21.0 (FY2024-25)', 'DEFRA 2024'],
        boundaryApproach: 'Operational Control',
        scope3Categories: result.scope3.categories.map((c) => c.category),
      });

      const exportData = {
        organisation: { name: orgName, sector: orgSector, state: orgState },
        period: { startDate: periodStartDate, endDate: periodEndDate },
        result,
        brsr,
        methodology,
      };

      if (format === 'pdf') {
        const { generatePdfReport } = await import('@/lib/export/pdf-export');
        generatePdfReport(exportData);
      } else if (format === 'word') {
        const { generateWordReport } = await import('@/lib/export/word-export');
        await generateWordReport(exportData);
      } else if (format === 'excel') {
        const { generateExcelReport } = await import('@/lib/export/excel-export');
        generateExcelReport(exportData);
      } else if (format === 'csv') {
        const { generateCsvExport } = await import('@/lib/export/excel-export');
        generateCsvExport(exportData);
      }
    })();

    toast.promise(exportPromise, {
      loading: `Exporting ${format.toUpperCase()}...`,
      success: `${format.toUpperCase()} exported successfully`,
      error: `Export failed`,
    });

    try {
      await exportPromise;
    } finally {
      setExporting(null);
    }
  }, [result, orgName, orgSector, orgState, periodStartDate, periodEndDate]);

  if (loadingResult) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center text-center py-10">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold">No Results Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete the data collection wizard to generate your GHG inventory.
            </p>
            <Link
              href="/wizard"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Wizard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">GHG Inventory Dashboard</h1>
            {orgName && (
              <p className="text-sm text-muted-foreground mt-0.5">{orgName}</p>
            )}
          </div>
          <PeriodPicker selectedId={selectedPeriodId} onSelect={handlePeriodSelect} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/wizard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            New Analysis
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting !== null}>
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? 'Exporting...' : 'Export'}
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                PDF Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')} className="gap-2 text-xs">
                <FileType className="h-3.5 w-3.5 text-muted-foreground" />
                Word Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                Excel Workbook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 text-xs">
                <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                CSV Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards result={result} />

      {/* Reduction CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Ready to reduce your emissions?</p>
              <p className="text-xs text-muted-foreground">Explore matched technologies, simulate impact, and find funding schemes.</p>
            </div>
          </div>
          <Link
            href={`/recommendations/${selectedPeriodId || result.periodId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Explore Reductions
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {/* Scope Chart + Top Sources */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScopeChart result={result} />
        <TopSources result={result} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="brsr">BRSR</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="space-y-6 pt-2">
            <FacilityBreakdown result={result} />
            <MonthlyTrend result={result} />
            <CrossCheckWarnings warnings={result.crossCheckWarnings} />
          </div>
        </TabsContent>

        <TabsContent value="brsr">
          <div className="pt-2">
            <BrsrTable result={result} />
          </div>
        </TabsContent>

        <TabsContent value="benchmarks">
          <div className="pt-2">
            <BenchmarkGauge result={result} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

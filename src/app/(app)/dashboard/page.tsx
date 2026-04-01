'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useWizardStore } from '@/lib/store';
import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine/brsr-mapper';
import KpiCards from '@/components/dashboard/kpi-cards';
import ScopeChart from '@/components/dashboard/scope-chart';
import TopSources from '@/components/dashboard/top-sources';
import FacilityBreakdown from '@/components/dashboard/facility-breakdown';
import CrossCheckWarnings from '@/components/dashboard/cross-check-warnings';
import BrsrTable from '@/components/dashboard/brsr-table';
import BenchmarkGauge from '@/components/dashboard/benchmark-gauge';
import MonthlyTrend from '@/components/dashboard/monthly-trend';
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
} from 'lucide-react';
import { toast } from 'sonner';

type ExportFormat = 'pdf' | 'word' | 'excel' | 'csv';

export default function DashboardPage() {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const result = useWizardStore((s) => s.calculationResult);
  const organisation = useWizardStore((s) => s.organisation);
  const period = useWizardStore((s) => s.period);
  const orgName = organisation.name;

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
        organisation: { name: organisation.name, sector: organisation.sector, state: organisation.state },
        period: { startDate: period.startDate, endDate: period.endDate },
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
  }, [result, organisation, period]);

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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">GHG Inventory Dashboard</h1>
          {orgName && (
            <p className="text-sm text-muted-foreground mt-0.5">{orgName}</p>
          )}
        </div>
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
            href={`/recommendations/${result.periodId}`}
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

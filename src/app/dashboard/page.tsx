'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useWizardStore } from '@/lib/store';
import { mapToBrsr, generateMethodologyNote } from '@/lib/calc-engine/brsr-mapper';
import { cn } from '@/lib/utils';
import KpiCards from '@/components/dashboard/kpi-cards';
import ScopeChart from '@/components/dashboard/scope-chart';
import TopSources from '@/components/dashboard/top-sources';
import FacilityBreakdown from '@/components/dashboard/facility-breakdown';
import CrossCheckWarnings from '@/components/dashboard/cross-check-warnings';
import BrsrTable from '@/components/dashboard/brsr-table';
import BenchmarkGauge from '@/components/dashboard/benchmark-gauge';
import MonthlyTrend from '@/components/dashboard/monthly-trend';

const TABS = ['Summary', 'BRSR', 'Benchmarks'] as const;
type Tab = (typeof TABS)[number];

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF Report', icon: '\u2193' },
  { id: 'word', label: 'Word Document', icon: '\u2193' },
  { id: 'excel', label: 'Excel Workbook', icon: '\u2193' },
  { id: 'csv', label: 'CSV Data', icon: '\u2193' },
] as const;

type ExportFormat = (typeof EXPORT_FORMATS)[number]['id'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Summary');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const result = useWizardStore((s) => s.calculationResult);
  const organisation = useWizardStore((s) => s.organisation);
  const period = useWizardStore((s) => s.period);
  const orgName = organisation.name;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [exportOpen]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!result) return;
    setExporting(format);
    setExportOpen(false);

    try {
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
        efSources: efSources.length > 0 ? efSources : ['IPCC 2006', 'CEA'],
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
    } catch (err) {
      console.error(`Export failed (${format}):`, err);
    } finally {
      setExporting(null);
    }
  }, [result, organisation, period]);

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">No Results Yet</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Complete the data collection wizard to generate your GHG inventory.
          </p>
          <Link
            href="/wizard"
            className="mt-6 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            Go to Wizard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/wizard"
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Back to Wizard
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">GHG Inventory Dashboard</h1>
              {orgName && (
                <p className="text-xs text-zinc-500">{orgName}</p>
              )}
            </div>
          </div>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting !== null}
              className={cn(
                'rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5',
                exporting
                  ? 'text-zinc-400 cursor-wait'
                  : 'text-zinc-600 hover:bg-zinc-50',
              )}
            >
              {exporting ? 'Exporting...' : 'Export'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2">
                <path d="M3 5l3 3 3-3" />
              </svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg z-50 py-1">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleExport(f.id)}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                  >
                    <span className="text-zinc-400">{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <KpiCards result={result} />

        {/* Reduction CTA */}
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-teal-900">Ready to reduce your emissions?</p>
            <p className="text-xs text-teal-600">Explore matched technologies, simulate impact, and find funding schemes.</p>
          </div>
          <Link
            href={`/recommendations/${result.periodId}`}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            Explore Reduction Technologies →
          </Link>
        </div>

        {/* Scope Chart + Top Sources */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ScopeChart result={result} />
          <TopSources result={result} />
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex border-b border-zinc-100 px-5">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === tab
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'Summary' && (
              <div className="space-y-6">
                <FacilityBreakdown result={result} />
                <MonthlyTrend result={result} />
                <CrossCheckWarnings warnings={result.crossCheckWarnings} />
              </div>
            )}

            {activeTab === 'BRSR' && (
              <BrsrTable result={result} />
            )}

            {activeTab === 'Benchmarks' && (
              <BenchmarkGauge result={result} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

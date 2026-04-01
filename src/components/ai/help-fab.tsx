'use client';

import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelpStore } from '@/lib/help-store';
import { useWizardStore } from '@/lib/store';
import { getSuggestedQuestions } from '@/lib/ai/suggested-questions';
import type { ActivityEntry } from '@/lib/store';

/** Map wizard step number (1-7) to suggested-questions key */
const STEP_KEY_MAP: Record<number, string> = {
  1: 'organisation',
  2: 'facilities',
  3: 'period',
  4: 'scope1',
  5: 'scope2',
  6: 'scope3',
  7: 'review',
};

/** Derive the help context key from current route + wizard step */
function useCurrentHelpStep(): string {
  const pathname = usePathname();
  const wizardStep = useWizardStore((s) => s.currentStep);

  if (pathname.startsWith('/wizard')) {
    return STEP_KEY_MAP[wizardStep] || 'organisation';
  }
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/recommendations')) return 'recommendations';
  if (pathname.startsWith('/funding')) return 'funding';
  return 'organisation';
}

/** Summarise fuel entries concisely: "Diesel (500 litres), Coal (10 tonnes)" */
function summariseEntries(entries: ActivityEntry[]): string {
  if (entries.length === 0) return 'None entered';
  return entries
    .filter((e) => e.fuelType && e.quantity)
    .map((e) => `${e.fuelType} (${e.quantity} ${e.unit})`)
    .join(', ') || 'None entered';
}

/** Build a concise text summary of the user's entire analysis for AI context */
function buildAnalysisSummary(): string {
  const state = useWizardStore.getState();
  const { organisation, facilities, period, scope1Data, scope2Data, scope3Data, calculationResult, productionTonnes } = state;

  const lines: string[] = [];

  // Organisation
  if (organisation.name) {
    lines.push(`Organisation: ${organisation.name}, Sector: ${organisation.sector || 'Iron & Steel'}, Sub-sector: ${organisation.subSector || 'not set'}, State: ${organisation.state || 'not set'}`);
  }

  // Facilities
  if (facilities.length > 0) {
    lines.push(`Facilities: ${facilities.map((f) => `${f.name} (${f.state}, ${f.gridRegion} grid)`).join('; ')}`);
  }

  // Period
  if (period.startDate) {
    lines.push(`Reporting period: ${period.startDate} to ${period.endDate}`);
  }

  // Production
  if (productionTonnes) {
    lines.push(`Annual production: ${productionTonnes} tonnes`);
  }

  // Scope 1 entries
  if (scope1Data.length > 0) {
    lines.push(`Scope 1 entries (${scope1Data.length}): ${summariseEntries(scope1Data)}`);
  }

  // Scope 2 entries
  if (scope2Data.length > 0) {
    lines.push(`Scope 2 entries (${scope2Data.length}): ${summariseEntries(scope2Data)}`);
  }

  // Scope 3 entries
  if (scope3Data.length > 0) {
    lines.push(`Scope 3 entries (${scope3Data.length}): ${summariseEntries(scope3Data)}`);
  }

  // Calculation results
  if (calculationResult) {
    const r = calculationResult;
    lines.push(`--- Calculation Results ---`);
    lines.push(`Scope 1 total: ${r.scope1.total.toFixed(4)} tCO2e`);
    lines.push(`Scope 2 total: ${r.scope2Location.total.toFixed(4)} tCO2e`);
    lines.push(`Scope 3 total: ${r.scope3.total.toFixed(4)} tCO2e`);
    lines.push(`Grand total: ${r.grandTotal.toFixed(4)} tCO2e`);

    if (r.intensityMetrics.perProduct != null) {
      lines.push(`Emission intensity: ${r.intensityMetrics.perProduct.toFixed(4)} tCO2e/tonne product`);
    }
    if (r.intensityMetrics.perTurnover != null) {
      lines.push(`Intensity per turnover: ${r.intensityMetrics.perTurnover.toFixed(4)} tCO2e/lakh INR`);
    }

    // Top sources
    if (r.topSources.length > 0) {
      const topStr = r.topSources
        .slice(0, 5)
        .map((s) => `${s.source} (${s.percent.toFixed(1)}%, ${s.co2e.toFixed(4)} tCO2e)`)
        .join('; ');
      lines.push(`Top emission sources: ${topStr}`);
    }

    // Facility breakdown
    if (r.facilityBreakdown.length > 0) {
      const fbStr = r.facilityBreakdown
        .map((f) => `${f.facilityName}: ${f.total.toFixed(4)} tCO2e`)
        .join('; ');
      lines.push(`By facility: ${fbStr}`);
    }

    // Data quality
    const dq = r.dataQuality.breakdown;
    const dqTotal = dq.total || 1;
    lines.push(`Data quality: ${((dq.primary / dqTotal) * 100).toFixed(0)}% primary, ${((dq.secondary / dqTotal) * 100).toFixed(0)}% secondary, ${((dq.estimated / dqTotal) * 100).toFixed(0)}% estimated (score: ${r.dataQuality.overall}/100 — ${r.dataQuality.grade})`);

    // Warnings
    if (r.crossCheckWarnings.length > 0) {
      lines.push(`Warnings: ${r.crossCheckWarnings.map((w) => w.message).join('; ')}`);
    }
  }

  return lines.join('\n');
}

export function HelpFab() {
  const { isOpen, open, setContext, setSuggestedQuestions } = useHelpStore();
  const stepKey = useCurrentHelpStep();
  const organisation = useWizardStore((s) => s.organisation);

  if (isOpen) return null;

  const handleClick = () => {
    const summary = buildAnalysisSummary();
    const ctx = {
      currentStep: stepKey,
      organisationSector: organisation.sector || undefined,
      organisationSubSector: organisation.subSector || undefined,
      organisationState: organisation.state || undefined,
      analysisSummary: summary || undefined,
    };
    setContext(ctx);
    setSuggestedQuestions(getSuggestedQuestions(stepKey, 3));
    open(ctx);
  };

  return (
    <Button
      size="icon"
      className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-30"
      onClick={handleClick}
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  );
}

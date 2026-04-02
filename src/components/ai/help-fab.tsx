'use client';

import { usePathname } from 'next/navigation';
import { MessageCircleQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHelpStore } from '@/lib/help-store';
import { useWizardStore } from '@/lib/store';
import { useWhatIfStore } from '@/lib/what-if-store';
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

  // ── Recommendation / What-If State ──
  const whatIf = useWhatIfStore.getState();
  if (whatIf.recommendations.length > 0) {
    lines.push('--- Recommendation Simulator State ---');
    lines.push(`Baseline total: ${whatIf.baselineTotal.toFixed(4)} tCO2e`);

    // Enabled technologies with their details
    const enabledTechs = whatIf.recommendations.filter((r) => whatIf.enabledTechIds.has(r.techId));
    const disabledTechs = whatIf.recommendations.filter((r) => !whatIf.enabledTechIds.has(r.techId));

    if (enabledTechs.length > 0) {
      lines.push(`Enabled technologies (${enabledTechs.length}):`);
      for (const t of enabledTechs) {
        const implPct = whatIf.implementedPcts[t.techId] || 0;
        const remainingPct = implPct > 0 ? ` [${implPct}% already implemented → ${100 - implPct}% remaining]` : '';
        lines.push(`  - ${t.name} (${t.techId}): CO2 reduction ${t.reductionMinTonnes.toFixed(2)}-${t.reductionMaxTonnes.toFixed(2)} tCO2e/yr, payback ${t.paybackMinYears}-${t.paybackMaxYears} yrs, CAPEX Rs ${t.capexMinLakhs ?? 0}-${t.capexMaxLakhs ?? 0}L${remainingPct}`);
      }
    }

    if (disabledTechs.length > 0) {
      lines.push(`Disabled technologies (${disabledTechs.length}): ${disabledTechs.map((t) => t.name).join(', ')}`);
    }

    // Technologies marked as already implemented
    const implEntries = Object.entries(whatIf.implementedPcts).filter(([, pct]) => pct > 0);
    if (implEntries.length > 0) {
      lines.push('Already implemented:');
      for (const [techId, pct] of implEntries) {
        const tech = whatIf.recommendations.find((r) => r.techId === techId);
        if (tech) lines.push(`  - ${tech.name}: ${pct}% implemented`);
      }
    }

    // Combined impact
    if (whatIf.combinedImpact) {
      const ci = whatIf.combinedImpact;
      lines.push(`Combined impact of enabled technologies:`);
      lines.push(`  Total reduction: ${ci.totalReductionTonnes.toFixed(4)} tCO2e (${ci.totalReductionPct.toFixed(1)}% of baseline)`);
      lines.push(`  Post-reduction total: ${ci.postReductionTotalTonnes.toFixed(4)} tCO2e`);
      lines.push(`  Total CAPEX: Rs ${ci.totalCapexMinLakhs.toFixed(1)}-${ci.totalCapexMaxLakhs.toFixed(1)} Lakhs`);
      lines.push(`  Annual savings: Rs ${Math.round(ci.totalAnnualSavingMinInr).toLocaleString('en-IN')}-${Math.round(ci.totalAnnualSavingMaxInr).toLocaleString('en-IN')}`);
      if (ci.blendedPaybackYears != null) {
        lines.push(`  Blended payback: ${ci.blendedPaybackYears.toFixed(1)} years`);
      }
    }

    // Funding matches
    const techsWithFunding = whatIf.recommendations.filter((r) => r.fundingMatches.length > 0);
    if (techsWithFunding.length > 0) {
      lines.push(`Technologies with funding: ${techsWithFunding.map((t) => `${t.name} (${t.fundingMatches.length} scheme${t.fundingMatches.length > 1 ? 's' : ''})`).join(', ')}`);
    }

    // Warnings
    const allWarnings = whatIf.recommendations.flatMap((r) => r.warnings.map((w) => `${r.name}: ${w}`));
    if (allWarnings.length > 0) {
      lines.push(`Warnings: ${allWarnings.join('; ')}`);
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
      className="fixed bottom-6 right-6 h-auto rounded-full shadow-lg z-30 gap-2 pl-4 pr-5 py-3"
      onClick={handleClick}
    >
      <MessageCircleQuestion className="h-4 w-4" />
      <span className="text-sm font-medium">Ask AI</span>
    </Button>
  );
}

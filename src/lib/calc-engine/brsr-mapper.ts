// ── BRSR Mapper ─────────────────────────────────────────────────────────────
// Maps calculation outputs to BRSR Principle 6 disclosure fields.
// Source: SEBI BRSR Core framework / NSE BRSR Guidance Note

import type { BrsrOutput, ScopeTotal, IntensityMetrics } from './types';

/**
 * Map inventory results to BRSR Principle 6 fields.
 */
export function mapToBrsr(params: {
  scope1: ScopeTotal;
  scope2: ScopeTotal;
  scope3: ScopeTotal;
  biogenicCo2Total: number;
  energyConsumedGj: number;
  renewablePercent: number;
  intensityMetrics: IntensityMetrics;
}): BrsrOutput {
  return {
    scope1Total: roundTo(params.scope1.total, 4),
    scope2Total: roundTo(params.scope2.total, 4),
    scope3Total: roundTo(params.scope3.total, 4),
    biogenicCo2Total: roundTo(params.biogenicCo2Total, 4),
    intensityPerTurnover: params.intensityMetrics.perTurnover
      ? roundTo(params.intensityMetrics.perTurnover, 6)
      : null,
    intensityPerProduct: params.intensityMetrics.perProduct
      ? roundTo(params.intensityMetrics.perProduct, 6)
      : null,
    totalEnergyGj: roundTo(params.energyConsumedGj, 2),
    renewablePercent: roundTo(params.renewablePercent, 2),
  };
}

/**
 * Generate methodology description for the report appendix.
 * Per ISO 14064-1 requirements.
 */
export function generateMethodologyNote(params: {
  gwpReport: string;
  efSources: string[];
  boundaryApproach: string;
  scope3Categories: string[];
}): string {
  const { gwpReport, efSources, boundaryApproach, scope3Categories } = params;

  return [
    `Organisational Boundary: ${boundaryApproach} approach as recommended by BRSR.`,
    '',
    `GHG Accounting Standard: GHG Protocol Corporate Accounting and Reporting Standard (Revised Edition, 2004).`,
    '',
    `Global Warming Potential (GWP): IPCC ${gwpReport} 100-year values.`,
    '',
    `Emission Factor Sources: ${efSources.join(', ')}.`,
    '',
    `GWP values: IPCC AR5 100-year (default). AR6 available.`,
    '',
    `Scope 1: Direct emissions from stationary combustion, mobile combustion, process emissions, and fugitive emissions owned or controlled by the organisation.`,
    '',
    `Scope 2: Indirect emissions from purchased grid electricity. Location-based method using CEA CO2 Baseline Database v21.0 regional grid emission factors (FY2024-25).`,
    '',
    scope3Categories.length > 0
      ? `Scope 3: Value chain emissions for categories: ${scope3Categories.join(', ')}. Spend-based estimation used where primary data unavailable (flagged as ESTIMATED quality).`
      : `Scope 3: Not reported for this period.`,
    '',
    `Base Year: As declared by the reporting organisation. Methodology locked per account for year-over-year consistency.`,
    '',
    `Uncertainty: Data quality scored per entry (PRIMARY/SECONDARY/ESTIMATED). Overall data quality score reported alongside emissions totals.`,
  ].join('\n');
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

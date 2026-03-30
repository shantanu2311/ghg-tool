// ── Recommendation Engine Orchestrator ──────────────────────────────────────
// Main entry point. Coordinates matching, impact calculation, and funding.
// All functions are pure — no DB calls, no side effects.

import type {
  RecommendationInput,
  RecommendationResult,
  TechWithFunding,
  CombinedImpact,
  TechImpact,
} from './types';
import { matchTechnologies } from './matcher';
import { calculateTechImpact } from './impact-calculator';
import { matchFunding, bestNetCapex } from './funding-matcher';

export { matchTechnologies } from './matcher';
export { calculateTechImpact } from './impact-calculator';
export { matchFunding, bestNetCapex } from './funding-matcher';
export * from './types';

/**
 * Generate full recommendations for a completed inventory.
 * Called once by the API; results are cached client-side.
 */
export function generateRecommendations(input: RecommendationInput): RecommendationResult {
  const {
    inventoryResult,
    activityData,
    calculations,
    organisation,
    facilityStates,
    allTechnologies,
    allFunding,
    allLinks,
    energyCostPerGj,
  } = input;

  // Step 1: Match technologies
  const { matched, notApplicable } = matchTechnologies({
    organisation,
    activityData,
    calculations: calculations.length > 0 ? calculations : inventoryResult.calculations,
    allTechnologies,
  });

  // Step 2: Calculate impact and match funding for each
  const recommendations: TechWithFunding[] = matched.map((tech) => {
    const impact = calculateTechImpact({
      technology: tech,
      grandTotal: inventoryResult.grandTotal,
      facilityStates,
      turnoverBracket: organisation.turnoverBracket,
      energyCostPerGj,
    });

    const fundingMatches = matchFunding({
      techId: tech.id,
      capexMinLakhs: tech.capexMinLakhs,
      capexMaxLakhs: tech.capexMaxLakhs,
      organisation: { turnoverBracket: organisation.turnoverBracket, state: organisation.state },
      facilityStates,
      allFunding,
      allLinks,
    });

    const { bestMin, bestMax } = bestNetCapex(
      fundingMatches,
      tech.capexMinLakhs,
      tech.capexMaxLakhs,
    );

    return {
      ...impact,
      fundingMatches,
      bestNetCapexMinLakhs: bestMin,
      bestNetCapexMaxLakhs: bestMax,
    };
  });

  // Step 3: Sort by payback ascending, then CO2 reduction descending
  recommendations.sort((a, b) => {
    const pa = a.paybackMinYears;
    const pb = b.paybackMinYears;
    if (pa !== pb) return pa - pb;
    return b.reductionMidTonnes - a.reductionMidTonnes;
  });

  // Step 4: Calculate combined impact (sequential, not additive)
  const combinedImpact = calculateCombinedImpact(
    recommendations,
    inventoryResult.grandTotal,
    inventoryResult.scope1.total,
    inventoryResult.scope2Location.total,
    inventoryResult.scope3.total,
  );

  return { recommendations, notApplicable, combinedImpact };
}

/**
 * Calculate the combined impact of multiple toggled technologies.
 * CRITICAL: Reductions are applied SEQUENTIALLY, not additively.
 *
 * This function is importable client-side for the What-If simulator.
 * It must have NO server-side dependencies.
 *
 * Technologies are sorted by payback (lowest first = quick wins first).
 * Each tech's reduction is applied to the RESIDUAL emissions, not the baseline.
 *
 * Example: VFDs (30%) + Solar (50%) on same emissions:
 *   VFDs: 100 × 0.30 = 30 saved, residual = 70
 *   Solar: 70 × 0.50 = 35 saved, residual = 35
 *   Total: 65% reduction (NOT 80%)
 */
export function calculateCombinedImpact(
  enabledTechs: TechImpact[],
  baselineTotal: number,
  baselineScope1: number,
  baselineScope2: number,
  baselineScope3: number,
): CombinedImpact {
  if (enabledTechs.length === 0 || baselineTotal <= 0) {
    return {
      baselineTotalTonnes: baselineTotal,
      baselineScope1Tonnes: baselineScope1,
      baselineScope2Tonnes: baselineScope2,
      baselineScope3Tonnes: baselineScope3,
      postReductionTotalTonnes: baselineTotal,
      totalReductionTonnes: 0,
      totalReductionPct: 0,
      totalCapexMinLakhs: 0,
      totalCapexMaxLakhs: 0,
      totalAnnualSavingMinInr: 0,
      totalAnnualSavingMaxInr: 0,
      blendedPaybackYears: null,
      technologySequence: [],
    };
  }

  // Sort by payback ascending for sequential application
  const sorted = [...enabledTechs].sort((a, b) => a.paybackMinYears - b.paybackMinYears);

  let residual = baselineTotal;
  const sequence: CombinedImpact['technologySequence'] = [];
  let totalCapexMin = 0;
  let totalCapexMax = 0;
  let totalSavingMin = 0;
  let totalSavingMax = 0;

  for (const tech of sorted) {
    // Apply this tech's mid reduction % to the residual
    const midPct = (tech.reductionMidTonnes / tech.matchedEmissionsTonnes) * 100;
    // But the reduction applies only to the fraction of residual that this tech addresses
    // Scale: what fraction of the ORIGINAL matched emissions is still in the residual?
    const residualFraction = residual / baselineTotal;
    const effectiveMatchedEmissions = tech.matchedEmissionsTonnes * residualFraction;
    const actualReduction = effectiveMatchedEmissions * (midPct / 100);

    residual -= actualReduction;
    if (residual < 0) residual = 0;

    sequence.push({
      techId: tech.techId,
      name: tech.name,
      reductionTonnes: actualReduction,
      residualAfterTonnes: residual,
    });

    totalCapexMin += tech.capexMinLakhs ?? 0;
    totalCapexMax += tech.capexMaxLakhs ?? 0;
    totalSavingMin += tech.costSavingMinInr * residualFraction;
    totalSavingMax += tech.costSavingMaxInr * residualFraction;
  }

  const totalReduction = baselineTotal - residual;
  const totalReductionPct = baselineTotal > 0 ? (totalReduction / baselineTotal) * 100 : 0;

  // Blended payback: total capex / total annual saving
  const capexMidInr = ((totalCapexMin + totalCapexMax) / 2) * 100000;
  const savingMidInr = (totalSavingMin + totalSavingMax) / 2;
  const blendedPaybackYears = savingMidInr > 0 ? capexMidInr / savingMidInr : null;

  return {
    baselineTotalTonnes: baselineTotal,
    baselineScope1Tonnes: baselineScope1,
    baselineScope2Tonnes: baselineScope2,
    baselineScope3Tonnes: baselineScope3,
    postReductionTotalTonnes: residual,
    totalReductionTonnes: totalReduction,
    totalReductionPct,
    totalCapexMinLakhs: totalCapexMin,
    totalCapexMaxLakhs: totalCapexMax,
    totalAnnualSavingMinInr: totalSavingMin,
    totalAnnualSavingMaxInr: totalSavingMax,
    blendedPaybackYears,
    technologySequence: sequence,
  };
}

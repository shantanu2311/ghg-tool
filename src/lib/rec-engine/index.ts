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
import { TECH_TO_LEVER } from './lever-groups';
import { TECH_END_USE, TECH_PHASE } from './end-use-splits';

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
    fuelProperties: input.fuelProperties,
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
 *
 * ORDER-INDEPENDENT: Uses end-use pools + multiplicative combination.
 * Result is the same regardless of which order techs are processed.
 *
 * Two-phase approach (standard energy planning hierarchy):
 *   Phase 1 — Efficiency measures: Each targets a specific end-use pool
 *     (lighting, motors, compressed air, etc.). Different end-uses are independent.
 *     Same end-use → multiplicative combination: 1 - ∏(1 - rᵢ)
 *   Phase 2 — Source switching (solar, fuel switch): Applies to residual
 *     after Phase 1 efficiency savings. Reduce demand first, then switch source.
 *
 * End-use splits sourced from BEE energy audits, SAMEEEKSHA, UNIDO.
 */
export function calculateCombinedImpact(
  enabledTechs: TechImpact[],
  baselineTotal: number,
  baselineScope1: number,
  baselineScope2: number,
  baselineScope3: number,
  implementedPcts?: Record<string, number>,
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

  // Enforce lever group exclusivity: only keep the first (best payback) tech per lever group
  const sorted = [...enabledTechs].sort((a, b) => a.paybackMinYears - b.paybackMinYears);
  const seenLevers = new Set<string>();
  const deduped = sorted.filter((tech) => {
    const lever = TECH_TO_LEVER[tech.techId];
    if (!lever) return true;
    if (seenLevers.has(lever)) return false;
    seenLevers.add(lever);
    return true;
  });

  // ── Phase 1: Efficiency measures (reduce demand) ──────────────────────
  // Group by end-use. Techs targeting the same end-use are combined multiplicatively.
  // Different end-uses are independent (additive on baseline).
  // Default to 'efficiency' for unknown tech IDs (e.g., test fixtures)
  const phase1 = deduped.filter((t) => (TECH_PHASE[t.techId] ?? 'efficiency') === 'efficiency');
  const phase2 = deduped.filter((t) => TECH_PHASE[t.techId] === 'source_switching');

  // For each end-use pool, compute the combined reduction fraction
  // using multiplicative combination: 1 - ∏(1 - rᵢ)
  const endUseReductions = new Map<string, { totalReduction: number; techs: TechImpact[] }>();

  for (const tech of phase1) {
    const endUse = TECH_END_USE[tech.techId] ?? 'all';
    if (!endUseReductions.has(endUse)) {
      endUseReductions.set(endUse, { totalReduction: 0, techs: [] });
    }
    endUseReductions.get(endUse)!.techs.push(tech);
  }

  // Calculate per-enduse reduction (multiplicative within each pool)
  const sequence: CombinedImpact['technologySequence'] = [];
  let totalCapexMin = 0;
  let totalCapexMax = 0;
  let totalSavingMin = 0;
  let totalSavingMax = 0;

  // Track residual for the waterfall display (cosmetic ordering by payback)
  let residual = baselineTotal;

  for (const [, group] of endUseReductions) {
    // Sort by payback within the end-use group for display order
    group.techs.sort((a, b) => a.paybackMinYears - b.paybackMinYears);

    // Multiplicative combination within this end-use pool
    let retainedFraction = 1.0;
    for (const tech of group.techs) {
      const midPct = tech.matchedEmissionsTonnes > 0
        ? (tech.reductionMidTonnes / tech.matchedEmissionsTonnes) * 100
        : 0;
      const alreadyPct = implementedPcts?.[tech.techId] ?? 0;
      const remainingFactor = (100 - alreadyPct) / 100;
      const effectivePct = (midPct / 100) * remainingFactor;

      // Each tech's actual reduction is its % of what's retained in this pool
      const techReduction = tech.matchedEmissionsTonnes * retainedFraction * effectivePct;
      retainedFraction *= (1 - effectivePct);

      residual -= techReduction;
      if (residual < 0) residual = 0;

      sequence.push({
        techId: tech.techId,
        name: tech.name,
        reductionTonnes: techReduction,
        residualAfterTonnes: residual,
      });

      totalCapexMin += tech.capexMinLakhs ?? 0;
      totalCapexMax += tech.capexMaxLakhs ?? 0;
      totalSavingMin += tech.costSavingMinInr * ((100 - alreadyPct) / 100);
      totalSavingMax += tech.costSavingMaxInr * ((100 - alreadyPct) / 100);
    }
  }

  // ── Phase 2: Source switching (green the supply) ──────────────────────
  // Applied to residual after Phase 1 efficiency savings
  for (const tech of phase2) {
    const midPct = tech.matchedEmissionsTonnes > 0
      ? (tech.reductionMidTonnes / tech.matchedEmissionsTonnes) * 100
      : 0;
    const alreadyPct = implementedPcts?.[tech.techId] ?? 0;
    const remainingFactor = (100 - alreadyPct) / 100;

    // Source switching applies to the residual emissions, not original matched
    // Scale matched emissions by how much residual remains vs baseline
    const residualFraction = residual / baselineTotal;
    const effectiveMatched = tech.matchedEmissionsTonnes * residualFraction;
    const techReduction = effectiveMatched * (midPct / 100) * remainingFactor;

    residual -= techReduction;
    if (residual < 0) residual = 0;

    sequence.push({
      techId: tech.techId,
      name: tech.name,
      reductionTonnes: techReduction,
      residualAfterTonnes: residual,
    });

    totalCapexMin += tech.capexMinLakhs ?? 0;
    totalCapexMax += tech.capexMaxLakhs ?? 0;
    totalSavingMin += tech.costSavingMinInr * remainingFactor;
    totalSavingMax += tech.costSavingMaxInr * remainingFactor;
  }

  const totalReduction = baselineTotal - residual;
  const totalReductionPct = baselineTotal > 0 ? (totalReduction / baselineTotal) * 100 : 0;

  // Blended payback: CAPEX-weighted harmonic mean
  let blendedCapexLakhs = 0;
  let blendedImpliedSavingLakhs = 0;
  for (const tech of deduped) {
    const capexMid = ((tech.capexMinLakhs ?? 0) + (tech.capexMaxLakhs ?? 0)) / 2;
    const paybackMid = (tech.paybackMinYears + tech.paybackMaxYears) / 2;
    if (capexMid > 0 && paybackMid > 0) {
      blendedCapexLakhs += capexMid;
      blendedImpliedSavingLakhs += capexMid / paybackMid;
    }
  }
  let blendedPaybackYears: number | null = blendedImpliedSavingLakhs > 0
    ? blendedCapexLakhs / blendedImpliedSavingLakhs
    : null;
  if (blendedPaybackYears !== null && blendedPaybackYears > 50) blendedPaybackYears = 50;

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

// ── GHG Calculation Engine Orchestrator ──────────────────────────────────────
// Main entry point. Coordinates all calculation modules.
// Pure functions — no side effects, no database access.

import type {
  CalculationInput,
  CalculationRecord,
  InventoryResult,
} from './types';
import { calculateEmission, matchEmissionFactor } from './emission-calculator';
import {
  aggregateByScope,
  getTopSources,
  aggregateByFacility,
  getMonthlyTrend,
  calculateEnergy,
  calculateIntensity,
} from './aggregator';
import { runCrossChecks } from './cross-check';
import { calculateDataQuality } from './data-quality';


/**
 * Run the full GHG inventory calculation.
 */
export function calculateInventory(input: CalculationInput): InventoryResult {
  const {
    organisationId,
    periodId,
    organisation,
    facilities,
    activityData,
    fuelProperties,
    emissionFactors,
    gwpSet,
    unitConversions,
    productionTonnes,
    annualTurnoverLakhInr,
  } = input;

  // Build facility grid region map
  const facilityGridMap = new Map(facilities.map((f) => [f.id, f.gridRegion]));

  // Calculate emissions for each activity data entry
  const calculations: CalculationRecord[] = [];
  const errors: { activityId: string; error: string }[] = [];

  for (const activity of activityData) {
    const gridRegion = facilityGridMap.get(activity.facilityId);

    // Match emission factor
    const ef = matchEmissionFactor(activity, emissionFactors, gridRegion);
    if (!ef) {
      errors.push({
        activityId: activity.id || '',
        error: `No emission factor found for ${activity.fuelType} (Scope ${activity.scope}, ${activity.sourceCategory})`,
      });
      continue;
    }

    // Calculate
    const result = calculateEmission({
      activity,
      emissionFactor: ef,
      gwpSet,
      fuelProperties,
      conversions: unitConversions,
    });

    if ('error' in result) {
      errors.push({ activityId: activity.id || '', error: result.error });
      continue;
    }

    calculations.push(result);
  }

  // Aggregate
  const { scope1, scope2, scope3 } = aggregateByScope(calculations, activityData);
  const grandTotal = scope1.total + scope2.total + scope3.total;
  const biogenicCo2Total = calculations.reduce((sum, c) => sum + c.biogenicCo2Tonnes, 0);

  // Energy consumption
  const { energyConsumedGj, renewablePercent } = calculateEnergy(activityData, fuelProperties);

  // Intensity metrics
  const intensityMetrics = calculateIntensity(
    grandTotal,
    productionTonnes,
    annualTurnoverLakhInr,
    organisation.employeeCount
  );

  // Data quality
  const dataQuality = calculateDataQuality(
    activityData.map((a) => ({
      dataQualityFlag: a.dataQualityFlag,
      totalCo2eTonnes: calculations.find((c) => c.activityDataId === a.id)?.totalCo2eTonnes,
    }))
  );

  // Cross-checks
  const crossCheckWarnings = runCrossChecks({
    subSector: organisation.subSector,
    productionTonnes,
    activities: activityData,
    calculations,
    grandTotal,
    facilityStates: facilities.map((f) => f.state),
  });

  // Top sources
  const topSources = getTopSources(calculations, activityData);

  // Facility breakdown
  const facilityBreakdown = aggregateByFacility(calculations, activityData, facilities);

  // Monthly trend
  const monthlyTrend = getMonthlyTrend(calculations, activityData);

  return {
    organisationId,
    periodId,
    scope1,
    scope2Location: scope2,
    scope2Market: null, // Market-based is optional, implement when RECs/PPAs are tracked
    scope3,
    grandTotal,
    biogenicCo2Total,
    energyConsumedGj,
    renewablePercent,
    intensityMetrics,
    dataQuality,
    crossCheckWarnings,
    calculations,
    topSources,
    facilityBreakdown,
    monthlyTrend,
    calculationErrors: errors,
  };
}

// Re-export BRSR mapper for report generation
export { mapToBrsr, generateMethodologyNote } from './brsr-mapper';

// Re-export types
export type { CalculationInput, InventoryResult, BrsrOutput } from './types';

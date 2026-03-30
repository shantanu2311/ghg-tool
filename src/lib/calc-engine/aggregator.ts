// ── Aggregator ──────────────────────────────────────────────────────────────
// Rolls up individual calculations into scope totals, facility breakdowns,
// monthly trends, energy consumption, and intensity metrics.

import type {
  CalculationRecord,
  ActivityDataInput,
  FacilityInput,
  ScopeTotal,
  IntensityMetrics,
  Scope,
} from './types';
import { KWH_TO_GJ } from './constants';

/**
 * Aggregate calculation records by scope.
 */
export function aggregateByScope(
  calculations: CalculationRecord[],
  activities: ActivityDataInput[]
): { scope1: ScopeTotal; scope2: ScopeTotal; scope3: ScopeTotal } {
  const actMap = new Map(activities.map((a) => [a.id, a]));

  const scopeTotals: Record<number, { total: number; categories: Map<string, number> }> = {
    1: { total: 0, categories: new Map() },
    2: { total: 0, categories: new Map() },
    3: { total: 0, categories: new Map() },
  };

  for (const calc of calculations) {
    const activity = actMap.get(calc.activityDataId);
    if (!activity) continue;

    const scope = activity.scope;
    const cat = activity.sourceCategory;

    scopeTotals[scope].total += calc.totalCo2eTonnes;
    scopeTotals[scope].categories.set(
      cat,
      (scopeTotals[scope].categories.get(cat) || 0) + calc.totalCo2eTonnes
    );
  }

  const toScopeTotal = (scope: Scope): ScopeTotal => ({
    scope,
    total: scopeTotals[scope].total,
    categories: Array.from(scopeTotals[scope].categories.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  });

  return {
    scope1: toScopeTotal(1),
    scope2: toScopeTotal(2),
    scope3: toScopeTotal(3),
  };
}

/**
 * Get top emission sources ranked by CO2e.
 */
export function getTopSources(
  calculations: CalculationRecord[],
  activities: ActivityDataInput[],
  limit = 5
): { source: string; co2e: number; percent: number }[] {
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const sourceMap = new Map<string, number>();
  let grandTotal = 0;

  for (const calc of calculations) {
    const activity = actMap.get(calc.activityDataId);
    const source = activity?.description || activity?.fuelType || 'Unknown';
    sourceMap.set(source, (sourceMap.get(source) || 0) + calc.totalCo2eTonnes);
    grandTotal += calc.totalCo2eTonnes;
  }

  return Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([source, co2e]) => ({
      source,
      co2e,
      percent: grandTotal > 0 ? (co2e / grandTotal) * 100 : 0,
    }));
}

/**
 * Break down emissions by facility.
 */
export function aggregateByFacility(
  calculations: CalculationRecord[],
  activities: ActivityDataInput[],
  facilities: FacilityInput[]
): { facilityId: string; facilityName: string; total: number }[] {
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const facMap = new Map(facilities.map((f) => [f.id, f.name]));
  const totals = new Map<string, number>();

  for (const calc of calculations) {
    const activity = actMap.get(calc.activityDataId);
    if (!activity) continue;
    totals.set(
      activity.facilityId,
      (totals.get(activity.facilityId) || 0) + calc.totalCo2eTonnes
    );
  }

  return Array.from(totals.entries())
    .map(([facilityId, total]) => ({
      facilityId,
      facilityName: facMap.get(facilityId) || 'Unknown',
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Monthly emissions trend (if monthly data provided).
 */
export function getMonthlyTrend(
  calculations: CalculationRecord[],
  activities: ActivityDataInput[]
): { month: number; total: number }[] | null {
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const hasMonthly = activities.some((a) => a.month != null);
  if (!hasMonthly) return null;

  const monthTotals = new Map<number, number>();
  for (const calc of calculations) {
    const activity = actMap.get(calc.activityDataId);
    if (!activity?.month) continue;
    monthTotals.set(
      activity.month,
      (monthTotals.get(activity.month) || 0) + calc.totalCo2eTonnes
    );
  }

  return Array.from(monthTotals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([month, total]) => ({ month, total }));
}

/**
 * Calculate total energy consumed in GJ and renewable percentage.
 */
export function calculateEnergy(
  activities: ActivityDataInput[],
  fuelProperties: { code: string; ncvTjPerGg: number | null; baseUnit: string; density: number | null }[]
): { energyConsumedGj: number; renewablePercent: number } {
  let totalGj = 0;
  let renewableKwh = 0;
  let totalElectricityKwh = 0;

  const fuelMap = new Map(fuelProperties.map((f) => [f.code, f]));

  for (const activity of activities) {
    if (!activity.quantity) continue;

    // Electricity
    if (activity.fuelType === 'GRID_ELECTRICITY' || activity.fuelType === 'RENEWABLE_ELECTRICITY') {
      const kwh = activity.quantity; // assumed kWh
      totalGj += kwh * KWH_TO_GJ;
      totalElectricityKwh += kwh;
      if (activity.fuelType === 'RENEWABLE_ELECTRICITY') {
        renewableKwh += kwh;
      }
      continue;
    }

    // Fuel energy via NCV
    const fuel = fuelMap.get(activity.fuelType);
    if (fuel?.ncvTjPerGg) {
      // Simplified: assume quantity is in base unit
      // NCV is TJ/Gg = TJ per 1000 tonnes
      // For tonne-based: energy_TJ = (quantity_tonnes / 1000) × NCV
      // For kL-based: energy_TJ = (quantity_kL × density / 1000) × NCV
      let tonnes = 0;
      if (fuel.baseUnit === 'tonne') tonnes = activity.quantity;
      else if (fuel.baseUnit === 'kL' && fuel.density) tonnes = activity.quantity * fuel.density;

      if (tonnes > 0) {
        const energyTj = (tonnes / 1000) * fuel.ncvTjPerGg;
        totalGj += energyTj * 1000; // TJ → GJ
      }
    }
  }

  const renewablePercent = totalElectricityKwh > 0
    ? (renewableKwh / totalElectricityKwh) * 100
    : 0;

  return { energyConsumedGj: totalGj, renewablePercent };
}

/**
 * Calculate emission intensity metrics.
 */
export function calculateIntensity(
  grandTotal: number,
  productionTonnes?: number,
  annualTurnoverLakhInr?: number,
  employeeCount?: number
): IntensityMetrics {
  return {
    perProduct: productionTonnes && productionTonnes > 0
      ? grandTotal / productionTonnes
      : null,
    perTurnover: annualTurnoverLakhInr && annualTurnoverLakhInr > 0
      ? grandTotal / annualTurnoverLakhInr
      : null,
    perEmployee: employeeCount && employeeCount > 0
      ? grandTotal / employeeCount
      : null,
  };
}

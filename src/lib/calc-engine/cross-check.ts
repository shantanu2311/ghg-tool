// ── Cross-Check Engine ──────────────────────────────────────────────────────
// Iron & Steel sector-specific sanity checks.
// Returns warnings — never blocks submission.

import type { CrossCheckWarning, ActivityDataInput, CalculationRecord } from './types';

// Expected intensity ranges by sub-sector (tCO2e per tonne of product)
// Sources: Worldsteel, IEA, BEE PAT scheme data
const INTENSITY_RANGES: Record<string, { min: number; max: number }> = {
  eaf_mini_mill: { min: 0.4, max: 0.5 },
  induction_furnace: { min: 0.6, max: 0.9 },
  re_rolling: { min: 0.15, max: 0.40 },
  forging: { min: 0.3, max: 0.6 },
  casting_foundry: { min: 0.5, max: 0.8 },
};

// EAF-specific electricity intensity (kWh/tonne)
const EAF_ELECTRICITY_RANGE = { min: 400, max: 700 };

/**
 * Run all cross-checks for Iron & Steel sector.
 */
export function runCrossChecks(params: {
  subSector: string;
  productionTonnes?: number;
  activities: ActivityDataInput[];
  calculations: CalculationRecord[];
  grandTotal: number;
  facilityStates?: string[];
}): CrossCheckWarning[] {
  const { subSector, productionTonnes, activities, calculations, grandTotal, facilityStates } = params;
  const warnings: CrossCheckWarning[] = [];

  // 1. Overall intensity check
  if (productionTonnes && productionTonnes > 0) {
    const intensity = grandTotal / productionTonnes;
    const range = INTENSITY_RANGES[subSector];
    if (range) {
      if (intensity < range.min * 0.5) {
        warnings.push({
          severity: 'warning',
          category: 'intensity',
          message: `Overall intensity (${intensity.toFixed(3)} tCO2e/tonne) is significantly below expected range for ${subSector} (${range.min}-${range.max}). This may indicate missing emission sources.`,
          expectedRange: { min: range.min, max: range.max, unit: 'tCO2e/tonne' },
          actualValue: intensity,
        });
      } else if (intensity > range.max * 2) {
        warnings.push({
          severity: 'warning',
          category: 'intensity',
          message: `Overall intensity (${intensity.toFixed(3)} tCO2e/tonne) is significantly above expected range for ${subSector} (${range.min}-${range.max}). Please verify data entries.`,
          expectedRange: { min: range.min, max: range.max, unit: 'tCO2e/tonne' },
          actualValue: intensity,
        });
      }
    }
  }

  // 2. EAF electricity intensity check
  if (subSector === 'eaf_mini_mill' && productionTonnes && productionTonnes > 0) {
    const electricityActivities = activities.filter(
      (a) => a.fuelType === 'GRID_ELECTRICITY' && a.scope === 2
    );
    const totalKwh = electricityActivities.reduce((sum, a) => sum + (a.quantity || 0), 0);
    if (totalKwh > 0) {
      const kwhPerTonne = totalKwh / productionTonnes;
      if (kwhPerTonne < EAF_ELECTRICITY_RANGE.min || kwhPerTonne > EAF_ELECTRICITY_RANGE.max) {
        warnings.push({
          severity: 'warning',
          category: 'eaf_electricity',
          message: `EAF electricity intensity (${kwhPerTonne.toFixed(0)} kWh/tonne) is outside typical range (${EAF_ELECTRICITY_RANGE.min}-${EAF_ELECTRICITY_RANGE.max} kWh/tonne).`,
          expectedRange: { ...EAF_ELECTRICITY_RANGE, unit: 'kWh/tonne' },
          actualValue: kwhPerTonne,
        });
      }
    }
  }

  // 3. Scope 2 should be significant for EAF/induction furnace
  if (['eaf_mini_mill', 'induction_furnace'].includes(subSector)) {
    const actMap = new Map(activities.map((a) => [a.id, a]));
    const scope2Total = calculations
      .filter((c) => actMap.get(c.activityDataId)?.scope === 2)
      .reduce((sum, c) => sum + c.totalCo2eTonnes, 0);

    if (grandTotal > 0 && scope2Total / grandTotal < 0.1) {
      warnings.push({
        severity: 'info',
        category: 'scope2_low',
        message: `Scope 2 is only ${((scope2Total / grandTotal) * 100).toFixed(1)}% of total. For ${subSector}, electricity is typically a major emission source. Please verify electricity data.`,
      });
    }
  }

  // 4. No DG set data for facilities in DG-heavy states
  const dgStates = ['Bihar', 'Jharkhand', 'Uttar Pradesh', 'Rajasthan'];
  const inDgState = facilityStates?.some((s) => dgStates.includes(s));
  const hasDg = activities.some((a) => a.sourceCategory === 'dg_diesel' || a.fuelType === 'DIESEL_HSD');
  if (!hasDg && inDgState) {
    warnings.push({
      severity: 'info',
      category: 'dg_set',
      message: 'No DG set diesel consumption recorded. Facilities in this state typically have significant DG reliance for backup power.',
    });
  }

  // 5. Missing Scope 3
  const hasScope3 = activities.some((a) => a.scope === 3);
  if (!hasScope3) {
    warnings.push({
      severity: 'info',
      category: 'scope3_missing',
      message: 'No Scope 3 data entered. For Iron & Steel MSMEs, purchased raw materials (scrap, iron ore) can be a significant value chain emission source.',
    });
  }

  return warnings;
}

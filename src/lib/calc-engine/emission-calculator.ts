// ── Emission Calculator ─────────────────────────────────────────────────────
// Core calculation: Activity Data × Emission Factor = GHG Emissions (CO2e)
// Per GHG Protocol Corporate Standard formula.

import type {
  ActivityDataInput,
  EmissionFactorData,
  FuelPropertyData,
  GwpSet,
  UnitConversionData,
  CalculationRecord,
  CalculationStep,

} from './types';
import { convertUnits, fuelToEnergyTJ } from './unit-converter';

/**
 * Calculate emissions for a single activity data entry.
 * Returns full breakdown with audit trail.
 */
export function calculateEmission(params: {
  activity: ActivityDataInput;
  emissionFactor: EmissionFactorData;
  gwpSet: GwpSet;
  fuelProperties: FuelPropertyData[];
  conversions: UnitConversionData[];
}): CalculationRecord | { error: string } {
  const { activity, emissionFactor: ef, gwpSet, fuelProperties, conversions } = params;
  const steps: CalculationStep[] = [];
  let stepNum = 0;

  // Step 1: Resolve quantity (spend → quantity if needed)
  const fuel = fuelProperties.find((f) => f.code === activity.fuelType);

  const convResult = convertUnits({
    inputMode: activity.inputMode,
    quantity: activity.quantity,
    unit: activity.unit,
    spendInr: activity.spendInr,
    targetUnit: ef.efUnit,
    fuelCode: activity.fuelType,
    fuelProperties,
    conversions,
  });

  if (convResult.warnings.some((w) => w.startsWith('Could not convert'))) {
    // Try energy-based conversion for IPCC EFs (unit = TJ)
    if (ef.efUnit === 'TJ' && fuel?.ncvTjPerGg) {
      // First resolve to fuel's base unit
      const baseConv = convertUnits({
        inputMode: activity.inputMode,
        quantity: activity.quantity,
        unit: activity.unit,
        spendInr: activity.spendInr,
        targetUnit: fuel.baseUnit,
        fuelCode: activity.fuelType,
        fuelProperties,
        conversions,
      });

      if (baseConv.warnings.some((w) => w.startsWith('Could not convert'))) {
        return { error: `Cannot convert ${activity.unit} to ${fuel.baseUnit} for ${activity.fuelType}` };
      }

      const energyResult = fuelToEnergyTJ(
        baseConv.resolvedQuantity,
        fuel.baseUnit,
        fuel.ncvTjPerGg,
        fuel.density
      );

      if (!energyResult) {
        return { error: `Cannot convert ${fuel.baseUnit} to TJ for ${activity.fuelType}` };
      }

      steps.push({
        step: ++stepNum,
        description: 'Convert to fuel base unit',
        formula: `${activity.quantity} ${activity.unit} → ${baseConv.resolvedQuantity.toFixed(6)} ${fuel.baseUnit}`,
        inputs: { quantity: activity.quantity || 0, unit: activity.unit || '', targetUnit: fuel.baseUnit },
        result: baseConv.resolvedQuantity,
        unit: fuel.baseUnit,
      });

      steps.push({
        step: ++stepNum,
        description: 'Convert fuel quantity to energy (TJ)',
        formula: `${baseConv.resolvedQuantity.toFixed(6)} ${fuel.baseUnit} × NCV → ${energyResult.energyTJ.toFixed(10)} TJ`,
        inputs: { quantity: baseConv.resolvedQuantity, ncvTjPerGg: fuel.ncvTjPerGg },
        result: energyResult.energyTJ,
        unit: 'TJ',
      });

      return computeEmissions({
        activityValue: energyResult.energyTJ,
        activityUnit: 'TJ',
        ef,
        gwpSet,
        activity,
        steps,
        stepNum,
      });
    }

    return { error: `Cannot convert ${activity.unit} to ${ef.efUnit} for ${activity.fuelType}` };
  }

  steps.push({
    step: ++stepNum,
    description: 'Resolve activity quantity',
    formula: `${activity.inputMode === 'spend' ? `INR ${activity.spendInr}` : `${activity.quantity} ${activity.unit}`} → ${convResult.resolvedQuantity.toFixed(6)} ${convResult.resolvedUnit}`,
    inputs: {
      inputMode: activity.inputMode,
      ...(activity.inputMode === 'spend' ? { spendInr: activity.spendInr || 0 } : { quantity: activity.quantity || 0, unit: activity.unit || '' }),
    },
    result: convResult.resolvedQuantity,
    unit: convResult.resolvedUnit,
  });

  return computeEmissions({
    activityValue: convResult.resolvedQuantity,
    activityUnit: convResult.resolvedUnit,
    ef,
    gwpSet,
    activity,
    steps,
    stepNum,
  });
}

function computeEmissions(params: {
  activityValue: number;
  activityUnit: string;
  ef: EmissionFactorData;
  gwpSet: GwpSet;
  activity: ActivityDataInput;
  steps: CalculationStep[];
  stepNum: number;
}): CalculationRecord {
  const { activityValue, ef, gwpSet, activity, steps } = params;
  let stepNum = params.stepNum;

  // Detect biogenic fuel (biomass combustion CO2 is reported separately per GHG Protocol)
  const isBiogenic = activity.fuelType.startsWith('BIOMASS');

  // CO2 calculation
  const co2Kg = activityValue * ef.co2Ef;
  const co2Tonnes = co2Kg / 1000;
  // For biogenic fuels, CO2 is a memo item — not added to Scope 1 total
  const reportedCo2Tonnes = isBiogenic ? 0 : co2Tonnes;
  const biogenicCo2Tonnes = isBiogenic ? co2Tonnes : 0;

  if (isBiogenic) {
    steps.push({
      step: ++stepNum,
      description: 'Calculate biogenic CO2 (memo item — excluded from Scope 1 per GHG Protocol)',
      formula: `${activityValue.toFixed(6)} ${params.activityUnit} × ${ef.co2Ef} kgCO2/${ef.efUnit} = ${co2Kg.toFixed(4)} kgCO2 = ${co2Tonnes.toFixed(6)} tCO2 (BIOGENIC)`,
      inputs: { activityData: activityValue, co2Ef: ef.co2Ef },
      result: co2Tonnes,
      unit: 'tCO2 (biogenic)',
    });
  } else {
    steps.push({
      step: ++stepNum,
      description: 'Calculate CO2 emissions',
      formula: `${activityValue.toFixed(6)} ${params.activityUnit} × ${ef.co2Ef} kgCO2/${ef.efUnit} = ${co2Kg.toFixed(4)} kgCO2 = ${co2Tonnes.toFixed(6)} tCO2`,
      inputs: { activityData: activityValue, co2Ef: ef.co2Ef },
      result: co2Tonnes,
      unit: 'tCO2',
    });
  }

  // CH4 calculation
  let ch4Co2eTonnes = 0;
  if (ef.ch4Ef && ef.ch4Ef > 0) {
    const ch4Kg = activityValue * ef.ch4Ef;
    const ch4Co2eKg = ch4Kg * (gwpSet.CH4 as number);
    ch4Co2eTonnes = ch4Co2eKg / 1000;
    steps.push({
      step: ++stepNum,
      description: 'Calculate CH4 emissions (as CO2e)',
      formula: `${activityValue.toFixed(6)} × ${ef.ch4Ef} kgCH4/${ef.efUnit} × GWP ${gwpSet.CH4} = ${ch4Co2eTonnes.toFixed(6)} tCO2e`,
      inputs: { activityData: activityValue, ch4Ef: ef.ch4Ef, gwpCh4: gwpSet.CH4 as number },
      result: ch4Co2eTonnes,
      unit: 'tCO2e',
    });
  }

  // N2O calculation
  let n2oCo2eTonnes = 0;
  if (ef.n2oEf && ef.n2oEf > 0) {
    const n2oKg = activityValue * ef.n2oEf;
    const n2oCo2eKg = n2oKg * (gwpSet.N2O as number);
    n2oCo2eTonnes = n2oCo2eKg / 1000;
    steps.push({
      step: ++stepNum,
      description: 'Calculate N2O emissions (as CO2e)',
      formula: `${activityValue.toFixed(6)} × ${ef.n2oEf} kgN2O/${ef.efUnit} × GWP ${gwpSet.N2O} = ${n2oCo2eTonnes.toFixed(6)} tCO2e`,
      inputs: { activityData: activityValue, n2oEf: ef.n2oEf, gwpN2o: gwpSet.N2O as number },
      result: n2oCo2eTonnes,
      unit: 'tCO2e',
    });
  }

  // Total CO2e (biogenic CO2 excluded, CH4/N2O from biomass ARE included per GHG Protocol)
  const totalCo2eTonnes = reportedCo2Tonnes + ch4Co2eTonnes + n2oCo2eTonnes;
  steps.push({
    step: ++stepNum,
    description: isBiogenic
      ? 'Calculate total CO2e (biogenic CO2 excluded; CH4/N2O included)'
      : 'Calculate total CO2e',
    formula: `${reportedCo2Tonnes.toFixed(6)} + ${ch4Co2eTonnes.toFixed(6)} + ${n2oCo2eTonnes.toFixed(6)} = ${totalCo2eTonnes.toFixed(6)} tCO2e`,
    inputs: { co2: reportedCo2Tonnes, ch4Co2e: ch4Co2eTonnes, n2oCo2e: n2oCo2eTonnes },
    result: totalCo2eTonnes,
    unit: 'tCO2e',
  });

  return {
    activityDataId: activity.id || '',
    efId: ef.id,
    efSource: ef.source,
    efVersion: ef.sourceVersion,
    gwpReport: gwpSet.report,
    co2Tonnes: reportedCo2Tonnes,
    ch4Co2eTonnes,
    n2oCo2eTonnes,
    totalCo2eTonnes,
    biogenicCo2Tonnes,
    calculationSteps: steps,
  };
}

/**
 * Match the best emission factor for a given activity data entry.
 * Prefers: regional match > national > any matching fuel/scope.
 */
export function matchEmissionFactor(
  activity: ActivityDataInput,
  emissionFactors: EmissionFactorData[],
  gridRegion?: string
): EmissionFactorData | null {
  const candidates = emissionFactors.filter(
    (ef) => ef.fuelOrActivity === activity.fuelType && ef.scope === activity.scope
  );

  if (candidates.length === 0) return null;

  // Prefer matching scope category
  const withCategory = activity.sourceCategory
    ? candidates.filter((ef) => ef.scopeCategory === activity.sourceCategory)
    : candidates;

  const pool = withCategory.length > 0 ? withCategory : candidates;

  // Prefer regional match for grid electricity
  if (gridRegion) {
    const regional = pool.find((ef) => ef.region === gridRegion);
    if (regional) return regional;
  }

  // Fall back to national (region = null)
  const national = pool.find((ef) => ef.region === null);
  if (national) return national;

  return pool[0];
}

// ── Unit Conversion Engine ──────────────────────────────────────────────────
// Handles Indian MSME unit chaos: litres, kg, tonnes, cylinders, bags, m³,
// kWh, units, lakh units, BTU, kcal, spend-based fallback.
// Every conversion is auditable via conversionPath.

import type {
  FuelPropertyData,
  UnitConversionData,
  ConversionStep,
} from './types';

export interface UnitConversionResult {
  resolvedQuantity: number;
  resolvedUnit: string;
  conversionPath: ConversionStep[];
  warnings: string[];
}

/**
 * Convert user input to the unit expected by the emission factor.
 *
 * Priority:
 * 1. Spend-based: INR → quantity via fuel price
 * 2. Direct match: unit already matches target
 * 3. Direct conversion from conversion table
 * 4. Fuel-specific alternate units
 * 5. 2-hop chain via intermediate unit
 * 6. Density-based conversion
 */
export function convertUnits(params: {
  inputMode: 'quantity' | 'spend';
  quantity?: number;
  unit?: string;
  spendInr?: number;
  targetUnit: string;
  fuelCode: string;
  fuelProperties: FuelPropertyData[];
  conversions: UnitConversionData[];
}): UnitConversionResult {
  const { inputMode, targetUnit, fuelCode, fuelProperties, conversions } = params;
  const path: ConversionStep[] = [];
  const warnings: string[] = [];

  let currentValue: number;
  let currentUnit: string;

  const fuel = fuelProperties.find((f) => f.code === fuelCode);

  // Step 1: Spend-based resolution
  if (inputMode === 'spend') {
    if (!params.spendInr || params.spendInr <= 0) {
      return { resolvedQuantity: 0, resolvedUnit: targetUnit, conversionPath: [], warnings: ['No spend amount provided'] };
    }
    if (!fuel?.defaultPriceInr || fuel.defaultPriceInr <= 0) {
      return { resolvedQuantity: 0, resolvedUnit: targetUnit, conversionPath: [], warnings: [`No default price for ${fuelCode}`] };
    }

    const priceUnit = getSpendUnit(fuel);
    currentValue = params.spendInr / fuel.defaultPriceInr;
    currentUnit = priceUnit;

    path.push({
      from: { value: params.spendInr, unit: 'INR' },
      to: { value: currentValue, unit: currentUnit },
      method: 'spend_to_quantity',
      factor: 1 / fuel.defaultPriceInr,
    });

    warnings.push('Spend-based estimate (ESTIMATED quality). Actual fuel price may differ.');
  } else {
    if (!params.quantity || !params.unit) {
      return { resolvedQuantity: 0, resolvedUnit: targetUnit, conversionPath: [], warnings: ['No quantity/unit provided'] };
    }
    currentValue = params.quantity;
    currentUnit = params.unit;
  }

  // Step 2: Already matches target?
  if (normalize(currentUnit) === normalize(targetUnit)) {
    return { resolvedQuantity: currentValue, resolvedUnit: targetUnit, conversionPath: path, warnings };
  }

  // Step 3: Direct conversion
  const direct = findConversion(currentUnit, targetUnit, fuelCode, conversions);
  if (direct) {
    const newValue = currentValue * direct.factor;
    path.push({
      from: { value: currentValue, unit: currentUnit },
      to: { value: newValue, unit: targetUnit },
      method: direct.fuelCode ? 'fuel_specific' : 'universal',
      factor: direct.factor,
    });
    return { resolvedQuantity: newValue, resolvedUnit: targetUnit, conversionPath: path, warnings };
  }

  // Step 4: Fuel alternate units
  if (fuel) {
    const alt = fuel.alternateUnits.find((a) => normalize(a.unit) === normalize(currentUnit));
    if (alt) {
      const intermediate = currentValue * alt.factor;
      path.push({
        from: { value: currentValue, unit: currentUnit },
        to: { value: intermediate, unit: alt.toUnit },
        method: 'alternate_unit',
        factor: alt.factor,
      });
      currentValue = intermediate;
      currentUnit = alt.toUnit;

      if (normalize(currentUnit) === normalize(targetUnit)) {
        return { resolvedQuantity: currentValue, resolvedUnit: targetUnit, conversionPath: path, warnings };
      }

      // One more hop
      const hop2 = findConversion(currentUnit, targetUnit, fuelCode, conversions);
      if (hop2) {
        const newValue = currentValue * hop2.factor;
        path.push({
          from: { value: currentValue, unit: currentUnit },
          to: { value: newValue, unit: targetUnit },
          method: hop2.fuelCode ? 'fuel_specific' : 'universal',
          factor: hop2.factor,
        });
        return { resolvedQuantity: newValue, resolvedUnit: targetUnit, conversionPath: path, warnings };
      }
    }
  }

  // Step 5: 2-hop chain via common intermediates
  const intermediates = ['kg', 'tonne', 'kL', 'litre', 'kWh', 'GJ'];
  for (const mid of intermediates) {
    const hop1 = findConversion(currentUnit, mid, fuelCode, conversions);
    const hop2 = findConversion(mid, targetUnit, fuelCode, conversions);
    if (hop1 && hop2) {
      const midValue = currentValue * hop1.factor;
      path.push({
        from: { value: currentValue, unit: currentUnit },
        to: { value: midValue, unit: mid },
        method: hop1.fuelCode ? 'fuel_specific' : 'universal',
        factor: hop1.factor,
      });
      const finalValue = midValue * hop2.factor;
      path.push({
        from: { value: midValue, unit: mid },
        to: { value: finalValue, unit: targetUnit },
        method: hop2.fuelCode ? 'fuel_specific' : 'universal',
        factor: hop2.factor,
      });
      return { resolvedQuantity: finalValue, resolvedUnit: targetUnit, conversionPath: path, warnings };
    }
  }

  // Step 6: Density-based
  if (fuel?.density) {
    const result = tryDensity(currentValue, currentUnit, targetUnit, fuel.density, path);
    if (result !== null) {
      return { resolvedQuantity: result, resolvedUnit: targetUnit, conversionPath: path, warnings };
    }
  }

  warnings.push(`Could not convert from ${currentUnit} to ${targetUnit} for ${fuelCode}`);
  return { resolvedQuantity: currentValue, resolvedUnit: currentUnit, conversionPath: path, warnings };
}

/**
 * Convert fuel quantity to energy in TJ for IPCC EF application.
 * Formula: quantity_in_Gg × NCV_TJ_per_Gg = energy in TJ
 */
export function fuelToEnergyTJ(
  quantityInBaseUnit: number,
  baseUnit: string,
  ncvTjPerGg: number,
  density?: number | null
): { energyTJ: number; steps: ConversionStep[] } | null {
  const steps: ConversionStep[] = [];
  let quantityGg: number;

  if (baseUnit === 'tonne') {
    quantityGg = quantityInBaseUnit / 1000;
    steps.push({
      from: { value: quantityInBaseUnit, unit: 'tonne' },
      to: { value: quantityGg, unit: 'Gg' },
      method: 'universal', factor: 0.001,
    });
  } else if (baseUnit === 'kL') {
    if (!density) return null;
    const tonnes = quantityInBaseUnit * density;
    quantityGg = tonnes / 1000;
    steps.push(
      { from: { value: quantityInBaseUnit, unit: 'kL' }, to: { value: tonnes, unit: 'tonne' }, method: 'density', factor: density },
      { from: { value: tonnes, unit: 'tonne' }, to: { value: quantityGg, unit: 'Gg' }, method: 'universal', factor: 0.001 }
    );
  } else if (baseUnit === 'thousand_m3') {
    if (!density) return null;
    const tonnes = quantityInBaseUnit * 1000 * density / 1000;
    quantityGg = tonnes / 1000;
    steps.push(
      { from: { value: quantityInBaseUnit, unit: 'thousand_m3' }, to: { value: tonnes, unit: 'tonne' }, method: 'density', factor: density },
      { from: { value: tonnes, unit: 'tonne' }, to: { value: quantityGg, unit: 'Gg' }, method: 'universal', factor: 0.001 }
    );
  } else {
    return null;
  }

  const energyTJ = quantityGg * ncvTjPerGg;
  steps.push({
    from: { value: quantityGg, unit: 'Gg' },
    to: { value: energyTJ, unit: 'TJ' },
    method: 'ncv', factor: ncvTjPerGg,
  });

  return { energyTJ, steps };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalize(unit: string): string {
  let u = unit.toLowerCase().replace(/[\s_-]/g, '');
  // Normalize common plurals: litres→litre, tonnes→tonne, etc.
  if (u.endsWith('s') && !u.endsWith('ss')) u = u.slice(0, -1);
  return u;
}

function findConversion(from: string, to: string, fuelCode: string, conversions: UnitConversionData[]): UnitConversionData | undefined {
  const fromN = normalize(from);
  const toN = normalize(to);
  return (
    conversions.find((c) => normalize(c.fromUnit) === fromN && normalize(c.toUnit) === toN && c.fuelCode === fuelCode) ||
    conversions.find((c) => normalize(c.fromUnit) === fromN && normalize(c.toUnit) === toN && c.fuelCode === null)
  );
}

function getSpendUnit(fuel: FuelPropertyData): string {
  if (fuel.code === 'LPG') return 'cylinder_domestic';
  if (fuel.category === 'electricity') return 'kWh';
  if (fuel.baseUnit === 'kL') return 'litre';
  return fuel.baseUnit;
}

function tryDensity(value: number, from: string, to: string, density: number, path: ConversionStep[]): number | null {
  const f = normalize(from), t = normalize(to);
  if (f === 'litre' && t === 'kg') {
    const r = value * density;
    path.push({ from: { value, unit: from }, to: { value: r, unit: to }, method: 'density', factor: density });
    return r;
  }
  if (f === 'kg' && t === 'litre') {
    const r = value / density;
    path.push({ from: { value, unit: from }, to: { value: r, unit: to }, method: 'density', factor: 1 / density });
    return r;
  }
  if (f === 'kl' && t === 'tonne') {
    const r = value * density;
    path.push({ from: { value, unit: from }, to: { value: r, unit: to }, method: 'density', factor: density });
    return r;
  }
  if (f === 'tonne' && t === 'kl') {
    const r = value / density;
    path.push({ from: { value, unit: from }, to: { value: r, unit: to }, method: 'density', factor: 1 / density });
    return r;
  }
  return null;
}

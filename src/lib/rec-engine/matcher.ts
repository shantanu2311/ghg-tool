// ── Technology Matching Engine ───────────────────────────────────────────────
// Pure function: no DB calls, no side effects.
// Implements the 5-filter cascade from the spec (Section 4.2).

import type { ActivityDataInput, CalculationRecord, FuelPropertyData } from '@/lib/calc-engine/types';
import type { TechnologyData, MatchedTechnology } from './types';
import { KWH_TO_GJ } from '@/lib/calc-engine/constants';

interface MatchInput {
  organisation: { sector: string; subSector: string };
  activityData: ActivityDataInput[];
  calculations: CalculationRecord[];
  allTechnologies: TechnologyData[];
  fuelProperties?: FuelPropertyData[];
}

/**
 * Match technologies against a user's inventory using 5-filter cascade:
 * 1. Sector filter
 * 2. Sub-sector filter
 * 3. Fuel/activity type filter
 * 4. Source category filter
 * 5. Emission threshold filter
 */
export function matchTechnologies(input: MatchInput): {
  matched: MatchedTechnology[];
  notApplicable: string[];
} {
  const { organisation, activityData, calculations, allTechnologies, fuelProperties } = input;
  const matched: MatchedTechnology[] = [];
  const notApplicable: string[] = [];

  // Build lookup: activityDataId → activity details
  const activityMap = new Map<string, ActivityDataInput>();
  for (const ad of activityData) {
    if (ad.id) activityMap.set(ad.id, ad);
  }

  // Build fuel property lookup for proper energy estimation
  const fuelMap = new Map<string, FuelPropertyData>();
  if (fuelProperties) {
    for (const fp of fuelProperties) {
      fuelMap.set(fp.code, fp);
    }
  }

  // Collect all fuel types and categories present in the user's inventory
  const userFuelTypes = new Set<string>();
  const userCategories = new Set<string>();
  for (const ad of activityData) {
    userFuelTypes.add(ad.fuelType);
    userCategories.add(ad.sourceCategory);
  }

  for (const tech of allTechnologies) {
    // Filter 1: Sector
    if (!tech.applicableSectors.includes(organisation.sector)) {
      notApplicable.push(tech.techId);
      continue;
    }

    // Filter 2: Sub-sector (null = applies to all)
    if (
      tech.matchesSubSectors !== null &&
      tech.matchesSubSectors.length > 0 &&
      !tech.matchesSubSectors.includes(organisation.subSector)
    ) {
      notApplicable.push(tech.techId);
      continue;
    }

    // Filter 3: Fuel type (null = no fuel-specific requirement)
    if (tech.matchesFuelTypes !== null && tech.matchesFuelTypes.length > 0) {
      const hasMatchingFuel = tech.matchesFuelTypes.some((ft) => userFuelTypes.has(ft));
      if (!hasMatchingFuel) {
        notApplicable.push(tech.techId);
        continue;
      }
    }

    // Filter 4: Source category (null = no category-specific requirement)
    if (tech.matchesCategories !== null && tech.matchesCategories.length > 0) {
      const hasMatchingCategory = tech.matchesCategories.some((cat) => userCategories.has(cat));
      if (!hasMatchingCategory) {
        notApplicable.push(tech.techId);
        continue;
      }
    }

    // Calculate matched emissions (sum of tCO2e from matching activities)
    const { matchedEmissions, matchedEnergyGj, matchedFuelTypes, matchedCategories } =
      calculateMatchedEmissions(tech, activityData, calculations, activityMap, fuelMap);

    // Filter 5: Emission threshold
    if (tech.minEmissionThreshold !== null && matchedEmissions < tech.minEmissionThreshold) {
      notApplicable.push(tech.techId);
      continue;
    }

    // Must have some matched emissions to be useful
    if (matchedEmissions <= 0) {
      notApplicable.push(tech.techId);
      continue;
    }

    matched.push({
      ...tech,
      matchedEmissionsTonnes: matchedEmissions,
      matchedEnergyGj: matchedEnergyGj,
      matchedFuelTypes,
      matchedCategories,
    });
  }

  return { matched, notApplicable };
}

/**
 * Sum emissions and energy from activities that match a technology's fuel types OR categories.
 *
 * Matching logic:
 * - If tech specifies BOTH fuel types and categories: match if EITHER matches (OR).
 *   This is because techs like "VFDs" match a category (motors) OR a fuel type (electricity).
 * - If tech specifies ONLY fuel types: match on fuel type.
 * - If tech specifies ONLY categories: match on category.
 * - If tech specifies neither: match ALL activities (universal tech).
 */
function calculateMatchedEmissions(
  tech: TechnologyData,
  activityData: ActivityDataInput[],
  calculations: CalculationRecord[],
  activityMap: Map<string, ActivityDataInput>,
  fuelMap: Map<string, FuelPropertyData>,
): {
  matchedEmissions: number;
  matchedEnergyGj: number;
  matchedFuelTypes: string[];
  matchedCategories: string[];
} {
  let matchedEmissions = 0;
  let matchedEnergyGj = 0;
  const matchedFuelTypes = new Set<string>();
  const matchedCategories = new Set<string>();

  const hasFuelFilter = tech.matchesFuelTypes !== null && tech.matchesFuelTypes.length > 0;
  const hasCategoryFilter = tech.matchesCategories !== null && tech.matchesCategories.length > 0;

  for (const calc of calculations) {
    const activity = activityMap.get(calc.activityDataId);
    if (!activity) continue;

    const fuelMatch = hasFuelFilter && tech.matchesFuelTypes!.includes(activity.fuelType);
    const categoryMatch = hasCategoryFilter && tech.matchesCategories!.includes(activity.sourceCategory);

    // Determine if this activity matches:
    // - Both filters set: OR (either fuel OR category matches)
    // - Only fuel filter: must match fuel
    // - Only category filter: must match category
    // - Neither filter: universal tech, matches everything
    let matches = false;
    if (hasFuelFilter && hasCategoryFilter) {
      matches = fuelMatch || categoryMatch;
    } else if (hasFuelFilter) {
      matches = fuelMatch;
    } else if (hasCategoryFilter) {
      matches = categoryMatch;
    } else {
      matches = true; // Universal tech
    }

    if (matches) {
      matchedEmissions += calc.totalCo2eTonnes;
      matchedFuelTypes.add(activity.fuelType);
      matchedCategories.add(activity.sourceCategory);

      // Estimate energy using fuel properties (NCV) when available
      matchedEnergyGj += estimateEnergyGj(activity, fuelMap);
    }
  }

  return {
    matchedEmissions,
    matchedEnergyGj,
    matchedFuelTypes: Array.from(matchedFuelTypes),
    matchedCategories: Array.from(matchedCategories),
  };
}

/**
 * Estimate energy content (GJ) of an activity entry using fuel properties.
 * Uses NCV (Net Calorific Value) for combustion fuels, kWh conversion for electricity.
 */
function estimateEnergyGj(
  activity: ActivityDataInput,
  fuelMap: Map<string, FuelPropertyData>,
): number {
  if (!activity.quantity || activity.quantity <= 0) return 0;

  // Electricity: direct kWh → GJ
  if (activity.fuelType === 'GRID_ELECTRICITY' || activity.fuelType === 'RENEWABLE_ELECTRICITY') {
    return activity.quantity * KWH_TO_GJ;
  }

  // Combustion fuels: use NCV from fuel properties
  const fuel = fuelMap.get(activity.fuelType);
  if (fuel?.ncvTjPerGg) {
    // NCV is in TJ/Gg (= TJ per 1000 tonnes)
    // Need to convert activity quantity to tonnes first
    let tonnes = 0;
    if (fuel.baseUnit === 'tonne') {
      tonnes = activity.quantity;
    } else if (fuel.baseUnit === 'kL' && fuel.density) {
      tonnes = activity.quantity * fuel.density;
    } else if (fuel.baseUnit === 'kg') {
      tonnes = activity.quantity / 1000;
    }

    if (tonnes > 0) {
      const energyTj = (tonnes / 1000) * fuel.ncvTjPerGg;
      return energyTj * 1000; // TJ → GJ
    }
  }

  // Fallback: use a reasonable default based on unit
  // Diesel ~36 GJ/kL, coal ~20 GJ/tonne, LPG ~47 GJ/tonne
  // Average ~25 GJ/tonne is a better fallback than 0.03 GJ/unit
  const unit = (activity.unit ?? '').toLowerCase();
  if (unit.includes('kwh')) return activity.quantity * KWH_TO_GJ;
  if (unit.includes('tonne')) return activity.quantity * 25; // ~25 GJ/tonne average
  if (unit.includes('kl') || unit.includes('kilolitre')) return activity.quantity * 35; // ~35 GJ/kL average
  if (unit.includes('litre')) return activity.quantity * 0.035; // ~35 GJ/kL / 1000
  if (unit.includes('kg')) return activity.quantity * 0.025; // ~25 GJ/tonne / 1000

  // Last resort: skip energy estimation rather than using a meaningless number
  return 0;
}

// ── Technology Matching Engine ───────────────────────────────────────────────
// Pure function: no DB calls, no side effects.
// Implements the 5-filter cascade from the spec (Section 4.2).

import type { ActivityDataInput, CalculationRecord } from '@/lib/calc-engine/types';
import type { TechnologyData, MatchedTechnology } from './types';
import { KWH_TO_GJ } from '@/lib/calc-engine/constants';

interface MatchInput {
  organisation: { sector: string; subSector: string };
  activityData: ActivityDataInput[];
  calculations: CalculationRecord[];
  allTechnologies: TechnologyData[];
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
  const { organisation, activityData, calculations, allTechnologies } = input;
  const matched: MatchedTechnology[] = [];
  const notApplicable: string[] = [];

  // Build lookup: activityDataId → activity details
  const activityMap = new Map<string, ActivityDataInput>();
  for (const ad of activityData) {
    if (ad.id) activityMap.set(ad.id, ad);
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
      calculateMatchedEmissions(tech, activityData, calculations, activityMap);

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
 * Sum emissions and energy from activities that match a technology's fuel types and categories.
 */
function calculateMatchedEmissions(
  tech: TechnologyData,
  activityData: ActivityDataInput[],
  calculations: CalculationRecord[],
  activityMap: Map<string, ActivityDataInput>,
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

  for (const calc of calculations) {
    const activity = activityMap.get(calc.activityDataId);
    if (!activity) continue;

    const fuelMatch =
      tech.matchesFuelTypes === null ||
      tech.matchesFuelTypes.length === 0 ||
      tech.matchesFuelTypes.includes(activity.fuelType);

    const categoryMatch =
      tech.matchesCategories === null ||
      tech.matchesCategories.length === 0 ||
      tech.matchesCategories.includes(activity.sourceCategory);

    if (fuelMatch && categoryMatch) {
      matchedEmissions += calc.totalCo2eTonnes;
      matchedFuelTypes.add(activity.fuelType);
      matchedCategories.add(activity.sourceCategory);

      // Estimate energy: for electricity, use kWh → GJ conversion
      if (activity.fuelType === 'GRID_ELECTRICITY' && activity.quantity) {
        matchedEnergyGj += activity.quantity * KWH_TO_GJ;
      } else if (activity.quantity) {
        // For fuels, rough estimate: quantity in base unit → GJ
        // This is approximate; exact conversion would need fuel properties
        matchedEnergyGj += activity.quantity * 0.03; // rough default GJ/unit
      }
    }
  }

  return {
    matchedEmissions,
    matchedEnergyGj,
    matchedFuelTypes: Array.from(matchedFuelTypes),
    matchedCategories: Array.from(matchedCategories),
  };
}

// ── Impact Calculator ───────────────────────────────────────────────────────
// Pure function: calculates the estimated CO2, energy, and cost impact
// of a single technology on the user's matched emissions.

import type { MatchedTechnology, TechImpact, ReductionStep } from './types';

// Default energy cost: ~Rs 8/kWh = Rs 2222/GJ (1 GJ = 277.78 kWh)
const DEFAULT_ENERGY_COST_PER_GJ = 2222;

// CGD-covered states for natural gas availability
const CGD_STATES = [
  'Gujarat', 'Maharashtra', 'Delhi', 'Haryana', 'Rajasthan',
  'Uttar Pradesh', 'Madhya Pradesh', 'Andhra Pradesh', 'Telangana',
  'Karnataka', 'Tamil Nadu', 'Punjab',
];

// Agricultural states with high biomass availability
const HIGH_BIOMASS_STATES = [
  'Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh',
  'Maharashtra', 'Tamil Nadu', 'Karnataka',
];

// Indian solar generation hours/year (average)
const SOLAR_HOURS_PER_YEAR = 1500;

interface ImpactInput {
  technology: MatchedTechnology;
  grandTotal: number;
  facilityStates: string[];
  turnoverBracket?: string;
  energyCostPerGj?: number;
}

/**
 * Calculate the estimated impact of a single technology on the user's inventory.
 */
export function calculateTechImpact(input: ImpactInput): TechImpact {
  const { technology: tech, grandTotal, facilityStates, turnoverBracket, energyCostPerGj } = input;
  const costPerGj = energyCostPerGj || DEFAULT_ENERGY_COST_PER_GJ;

  const warnings: string[] = [];
  const steps: ReductionStep[] = [];

  // ── CO2 Reduction ──
  const reductionMinTonnes = tech.matchedEmissionsTonnes * (tech.co2ReductionMinPct / 100);
  const reductionMaxTonnes = tech.matchedEmissionsTonnes * (tech.co2ReductionMaxPct / 100);
  const reductionMidTonnes = (reductionMinTonnes + reductionMaxTonnes) / 2;

  steps.push({
    step: 'matched_emissions',
    description: `Emissions from matching activities (${tech.matchedFuelTypes.join(', ')})`,
    value: tech.matchedEmissionsTonnes,
    unit: 'tCO2e',
  });
  steps.push({
    step: 'co2_reduction_range',
    description: `CO2 reduction: ${tech.co2ReductionMinPct}-${tech.co2ReductionMaxPct}%`,
    value: reductionMidTonnes,
    unit: 'tCO2e',
  });

  // ── Energy Saving ──
  const energySavingMinGj = tech.matchedEnergyGj * (tech.energySavingMinPct / 100);
  const energySavingMaxGj = tech.matchedEnergyGj * (tech.energySavingMaxPct / 100);

  // ── Cost Saving ──
  const costSavingMinInr = energySavingMinGj * costPerGj;
  const costSavingMaxInr = energySavingMaxGj * costPerGj;
  const costSavingMidInr = (costSavingMinInr + costSavingMaxInr) / 2;

  // ── Payback Estimate ──
  let paybackEstimateYears: number | null = null;
  if (tech.capexMinLakhs !== null && tech.capexMaxLakhs !== null && costSavingMidInr > 0) {
    const capexMidInr = ((tech.capexMinLakhs + tech.capexMaxLakhs) / 2) * 100000; // lakhs → INR
    paybackEstimateYears = Math.min(capexMidInr / costSavingMidInr, 50); // Cap at 50 years
    steps.push({
      step: 'payback_estimate',
      description: `CAPEX ₹${(capexMidInr / 100000).toFixed(1)}L / annual saving ₹${(costSavingMidInr / 100000).toFixed(1)}L`,
      value: paybackEstimateYears,
      unit: 'years',
    });
  }

  // ── % of Total ──
  const pctOfTotal = grandTotal > 0 ? (reductionMidTonnes / grandTotal) * 100 : 0;

  // ── Special Warnings ──
  // Natural gas availability check (T019)
  if (tech.techId === 'T019') {
    const hasCGD = facilityStates.some((s) => CGD_STATES.includes(s));
    if (!hasCGD) {
      warnings.push(
        'PNG may not be available in your area yet. Check with your local CGD operator.',
      );
    }
  }

  // Rooftop solar sizing (T015, T016)
  if (tech.techId === 'T015' || tech.techId === 'T016') {
    // Estimate from matched energy: GJ → kWh → kWp
    const annualKwh = tech.matchedEnergyGj / 0.0036; // 1 kWh = 0.0036 GJ
    const requiredKwp = annualKwh / SOLAR_HOURS_PER_YEAR;
    if (requiredKwp > 500) {
      warnings.push(
        `Estimated solar capacity needed: ${Math.round(requiredKwp)} kWp. This likely needs roof area > 5000 sqft.`,
      );
    }
    steps.push({
      step: 'solar_sizing',
      description: `Annual ${Math.round(annualKwh)} kWh / ${SOLAR_HOURS_PER_YEAR} solar hrs`,
      value: requiredKwp,
      unit: 'kWp',
    });
  }

  // RESCO vs CAPEX recommendation (T015 vs T016)
  if (tech.techId === 'T015' && turnoverBracket === 'micro') {
    warnings.push(
      'As a micro enterprise, consider RESCO model (T016) with zero upfront investment instead of CAPEX model.',
    );
  }

  // Biomass supply check (T020, T021)
  if (tech.techId === 'T020' || tech.techId === 'T021') {
    const hasBiomass = facilityStates.some((s) => HIGH_BIOMASS_STATES.includes(s));
    if (hasBiomass) {
      warnings.push('High biomass availability in your region.');
    } else {
      warnings.push('Check local biomass supply availability before proceeding.');
    }
  }

  return {
    techId: tech.techId,
    name: tech.name,
    category: tech.category,
    reductionMinTonnes,
    reductionMaxTonnes,
    reductionMidTonnes,
    energySavingMinGj,
    energySavingMaxGj,
    costSavingMinInr,
    costSavingMaxInr,
    capexMinLakhs: tech.capexMinLakhs,
    capexMaxLakhs: tech.capexMaxLakhs,
    paybackMinYears: tech.paybackMinYears,
    paybackMaxYears: tech.paybackMaxYears,
    paybackEstimateYears,
    pctOfTotal,
    matchedEmissionsTonnes: tech.matchedEmissionsTonnes,
    matchedEnergyGj: tech.matchedEnergyGj,
    scopeAddressed: tech.scopeAddressed,
    energyTypeSaved: tech.energyTypeSaved,
    technologyReadiness: tech.technologyReadiness,
    demonstratedInIndia: tech.demonstratedInIndia,
    indianClusters: tech.indianClusters,
    description: tech.description,
    source: tech.source,
    sourceUrl: tech.sourceUrl,
    warnings,
    reductionSteps: steps,
    endUseShare: tech.endUseShare,
    endUseLabel: tech.endUseLabel,
  };
}

// ── Recommendation Engine Types ─────────────────────────────────────────────
// All types for Module 2 (Reduction Recommendations) and Module 3 (Funding Matcher)

import type { ActivityDataInput, InventoryResult, CalculationRecord } from '@/lib/calc-engine/types';

// ── Technology Data (parsed from Prisma model) ─────────────────────────────

export interface TechnologyData {
  id: string;
  techId: string;                  // T001, T002, etc.
  name: string;
  category: string;
  applicableSectors: string[];
  scopeAddressed: string;
  energyTypeSaved: string;
  description: string;
  energySavingMinPct: number;
  energySavingMaxPct: number;
  co2ReductionMinPct: number;
  co2ReductionMaxPct: number;
  paybackMinYears: number;
  paybackMaxYears: number;
  capexMinLakhs: number | null;
  capexMaxLakhs: number | null;
  technologyReadiness: string;
  demonstratedInIndia: boolean;
  indianClusters: string[] | null;
  matchesFuelTypes: string[] | null;
  matchesCategories: string[] | null;
  matchesSubSectors: string[] | null;
  minEmissionThreshold: number | null;
  source: string;
  sourceUrl: string | null;
}

// ── Funding Data (parsed from Prisma model) ────────────────────────────────

export interface FundingData {
  id: string;
  schemeId: string;                // S001, S002, etc.
  name: string;
  implementingAgency: string;
  targetBeneficiary: string;
  supportType: string;
  financialDetails: string;
  sectorsCovered: string[];
  eligibilityCriteria: string;
  requiredDocuments: string[] | null;
  minEnergySaving: number | null;
  turnoverBrackets: string[] | null;
  applicableStates: string[] | null;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  applicationUrl: string | null;
  reportedImpact: string | null;
  source: string;
  sourceUrl: string | null;
}

export interface TechFundingLinkData {
  techId: string;
  fundingId: string;
  subsidyPct: number | null;
  maxAmountLakhs: number | null;
  notes: string | null;
}

// ── Matching Result ────────────────────────────────────────────────────────

export interface MatchedTechnology extends TechnologyData {
  matchedEmissionsTonnes: number;
  matchedEnergyGj: number;
  matchedFuelTypes: string[];
  matchedCategories: string[];
}

// ── Impact Estimate ────────────────────────────────────────────────────────

export interface TechImpact {
  techId: string;
  name: string;
  category: string;
  reductionMinTonnes: number;
  reductionMaxTonnes: number;
  reductionMidTonnes: number;
  energySavingMinGj: number;
  energySavingMaxGj: number;
  costSavingMinInr: number;
  costSavingMaxInr: number;
  capexMinLakhs: number | null;
  capexMaxLakhs: number | null;
  paybackMinYears: number;
  paybackMaxYears: number;
  paybackEstimateYears: number | null;
  pctOfTotal: number;
  matchedEmissionsTonnes: number;
  matchedEnergyGj: number;
  scopeAddressed: string;
  technologyReadiness: string;
  demonstratedInIndia: boolean;
  description: string;
  source: string;
  sourceUrl: string | null;
  warnings: string[];
  reductionSteps: ReductionStep[];
}

export interface ReductionStep {
  step: string;
  description: string;
  value: number;
  unit: string;
}

// ── Funding Match ──────────────────────────────────────────────────────────

export interface FundingMatch {
  schemeId: string;
  name: string;
  implementingAgency: string;
  supportType: string;
  financialDetails: string;
  eligibilityCriteria: string;
  requiredDocuments: string[] | null;
  applicationUrl: string | null;
  subsidyPct: number | null;
  maxAmountLakhs: number | null;
  notes: string | null;
  status: string;
  netCapexMinLakhs: number | null;
  netCapexMaxLakhs: number | null;
}

// ── Combined Result ────────────────────────────────────────────────────────

export interface TechWithFunding extends TechImpact {
  fundingMatches: FundingMatch[];
  bestNetCapexMinLakhs: number | null;
  bestNetCapexMaxLakhs: number | null;
}

export interface CombinedImpact {
  baselineTotalTonnes: number;
  baselineScope1Tonnes: number;
  baselineScope2Tonnes: number;
  baselineScope3Tonnes: number;
  postReductionTotalTonnes: number;
  totalReductionTonnes: number;
  totalReductionPct: number;
  totalCapexMinLakhs: number;
  totalCapexMaxLakhs: number;
  totalAnnualSavingMinInr: number;
  totalAnnualSavingMaxInr: number;
  blendedPaybackYears: number | null;
  technologySequence: {
    techId: string;
    name: string;
    reductionTonnes: number;
    residualAfterTonnes: number;
  }[];
}

export interface RecommendationResult {
  recommendations: TechWithFunding[];
  notApplicable: string[];
  combinedImpact: CombinedImpact;
}

// ── Engine Input ───────────────────────────────────────────────────────────

export interface RecommendationInput {
  inventoryResult: InventoryResult;
  activityData: ActivityDataInput[];
  calculations: CalculationRecord[];
  organisation: {
    sector: string;
    subSector: string;
    state: string;
    turnoverBracket?: string;
  };
  facilityStates: string[];
  productionTonnes?: number;
  annualTurnoverLakhInr?: number;
  allTechnologies: TechnologyData[];
  allFunding: FundingData[];
  allLinks: TechFundingLinkData[];
  energyCostPerGj?: number; // INR per GJ, default derived from fuel prices
}

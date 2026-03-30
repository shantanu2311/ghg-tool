// ── Recommendation Engine Tests ─────────────────────────────────────────────
// 8 test scenarios from the spec (Section 10):
// 1. EAF Mini Mill matching
// 2. Foundry matching
// 3. Re-Rolling Mill matching
// 4. Impact calculation math
// 5. Funding matching
// 6. No-match edge case
// 7. Combination impact (sequential, NOT additive)
// 8. Edge cases

import { describe, it, expect } from 'vitest';
import { matchTechnologies } from '@/lib/rec-engine/matcher';
import { calculateTechImpact } from '@/lib/rec-engine/impact-calculator';
import { matchFunding, bestNetCapex } from '@/lib/rec-engine/funding-matcher';
import { calculateCombinedImpact } from '@/lib/rec-engine/index';
import type {
  TechnologyData,
  FundingData,
  TechFundingLinkData,
  MatchedTechnology,
  TechImpact,
} from '@/lib/rec-engine/types';
import type { ActivityDataInput, CalculationRecord } from '@/lib/calc-engine/types';

// ── Fixture Factories ──────────────────────────────────────────────────────

let idCounter = 0;
function genId() { return `test-${++idCounter}`; }

function makeTech(overrides: Partial<TechnologyData>): TechnologyData {
  return {
    id: genId(),
    techId: 'T999',
    name: 'Test Tech',
    category: 'Energy Efficiency - Cross Sector',
    applicableSectors: ['iron_steel'],
    scopeAddressed: 'Scope 2',
    energyTypeSaved: 'Electrical',
    description: 'Test technology',
    energySavingMinPct: 20,
    energySavingMaxPct: 40,
    co2ReductionMinPct: 20,
    co2ReductionMaxPct: 40,
    paybackMinYears: 1,
    paybackMaxYears: 3,
    capexMinLakhs: 5,
    capexMaxLakhs: 15,
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    indianClusters: null,
    matchesFuelTypes: ['GRID_ELECTRICITY'],
    matchesCategories: ['grid_electricity'],
    matchesSubSectors: null,
    minEmissionThreshold: null,
    source: 'Test',
    sourceUrl: null,
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ActivityDataInput>): ActivityDataInput {
  return {
    id: genId(),
    facilityId: 'fac-1',
    scope: 1,
    sourceCategory: 'stationary_combustion',
    fuelType: 'COAL_INDIAN',
    inputMode: 'quantity',
    quantity: 100,
    unit: 'tonne',
    dataQualityFlag: 'SECONDARY',
    ...overrides,
  };
}

function makeCalc(activityDataId: string, totalCo2eTonnes: number): CalculationRecord {
  return {
    activityDataId,
    efId: 'ef-1',
    efSource: 'IPCC',
    efVersion: '2006',
    gwpReport: 'AR5',
    co2Tonnes: totalCo2eTonnes * 0.95,
    ch4Co2eTonnes: totalCo2eTonnes * 0.03,
    n2oCo2eTonnes: totalCo2eTonnes * 0.02,
    totalCo2eTonnes,
    biogenicCo2Tonnes: 0,
    calculationSteps: [],
  };
}

function makeFunding(overrides: Partial<FundingData>): FundingData {
  return {
    id: genId(),
    schemeId: 'S999',
    name: 'Test Scheme',
    implementingAgency: 'Test Agency',
    targetBeneficiary: 'MSMEs',
    supportType: 'Subsidy',
    financialDetails: 'Test details',
    sectorsCovered: ['iron_steel'],
    eligibilityCriteria: 'Test',
    requiredDocuments: ['Udyam certificate'],
    minEnergySaving: null,
    turnoverBrackets: ['micro', 'small', 'medium'],
    applicableStates: null,
    status: 'Active',
    validFrom: null,
    validTo: null,
    applicationUrl: null,
    reportedImpact: null,
    source: 'Test',
    sourceUrl: null,
    ...overrides,
  };
}

// ── Shared Tech Database (subset matching seed) ─────────────────────────────

const T001_VFD = makeTech({
  id: 'tech-vfd', techId: 'T001', name: 'Variable Frequency Drives (VFDs)',
  matchesFuelTypes: ['GRID_ELECTRICITY'], matchesCategories: ['grid_electricity'],
  matchesSubSectors: ['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry'],
  co2ReductionMinPct: 20, co2ReductionMaxPct: 40,
  energySavingMinPct: 20, energySavingMaxPct: 40,
  paybackMinYears: 0.5, paybackMaxYears: 1.5,
  capexMinLakhs: 1, capexMaxLakhs: 15,
});

const T009_DBC = makeTech({
  id: 'tech-dbc', techId: 'T009', name: 'Divided Blast Cupola (DBC)',
  category: 'Sector Specific - Iron & Steel',
  scopeAddressed: 'Scope 1', energyTypeSaved: 'Thermal',
  matchesFuelTypes: ['COKE'], matchesCategories: ['stationary_combustion'],
  matchesSubSectors: ['casting_foundry'],
  co2ReductionMinPct: 35, co2ReductionMaxPct: 45,
  paybackMinYears: 2, paybackMaxYears: 3,
  capexMinLakhs: 15, capexMaxLakhs: 40,
});

const T010_ZIGZAG = makeTech({
  id: 'tech-zigzag', techId: 'T010', name: 'Zig-Zag Kiln Technology',
  applicableSectors: ['brick_kilns'],
  matchesFuelTypes: null, matchesCategories: null,
  matchesSubSectors: ['brick_kilns'],
});

const T014_SAND = makeTech({
  id: 'tech-sand', techId: 'T014', name: 'Automated Sand Reclamation',
  matchesFuelTypes: ['GRID_ELECTRICITY', 'COAL_INDIAN'],
  matchesCategories: ['stationary_combustion', 'grid_electricity'],
  matchesSubSectors: ['casting_foundry'],
  co2ReductionMinPct: 5, co2ReductionMaxPct: 10,
});

const T015_SOLAR = makeTech({
  id: 'tech-solar', techId: 'T015', name: 'Rooftop Solar PV (CAPEX)',
  category: 'Green Electricity',
  matchesFuelTypes: ['GRID_ELECTRICITY'], matchesCategories: ['grid_electricity'],
  matchesSubSectors: null, // all sub-sectors
  co2ReductionMinPct: 30, co2ReductionMaxPct: 70,
  paybackMinYears: 3, paybackMaxYears: 5,
  capexMinLakhs: 40, capexMaxLakhs: 60,
});

const T016_RESCO = makeTech({
  id: 'tech-resco', techId: 'T016', name: 'Rooftop Solar PV (RESCO)',
  category: 'Green Electricity',
  matchesFuelTypes: ['GRID_ELECTRICITY'], matchesCategories: ['grid_electricity'],
  matchesSubSectors: null,
  co2ReductionMinPct: 30, co2ReductionMaxPct: 60,
  paybackMinYears: 0, paybackMaxYears: 0,
  capexMinLakhs: 0, capexMaxLakhs: 0,
});

const T019_PNG = makeTech({
  id: 'tech-png', techId: 'T019', name: 'Coal to Natural Gas (PNG) Switch',
  category: 'Alternative Fuels',
  scopeAddressed: 'Scope 1', energyTypeSaved: 'Thermal',
  matchesFuelTypes: ['COAL_INDIAN', 'COKING_COAL', 'COKE', 'FURNACE_OIL'],
  matchesCategories: ['stationary_combustion'],
  matchesSubSectors: ['re_rolling', 'forging', 'casting_foundry'],
  co2ReductionMinPct: 40, co2ReductionMaxPct: 50,
  paybackMinYears: 2, paybackMaxYears: 4,
  capexMinLakhs: 5, capexMaxLakhs: 30,
});

const T020_BIOMASS = makeTech({
  id: 'tech-biomass', techId: 'T020', name: 'Biomass Briquettes',
  category: 'Alternative Fuels',
  matchesFuelTypes: ['COAL_INDIAN', 'FURNACE_OIL'],
  matchesCategories: ['stationary_combustion'],
  matchesSubSectors: ['re_rolling', 'casting_foundry'],
  co2ReductionMinPct: 80, co2ReductionMaxPct: 95,
});

const T004_WHRS = makeTech({
  id: 'tech-whrs', techId: 'T004', name: 'Waste Heat Recovery Systems (WHRS)',
  scopeAddressed: 'Scope 1 + Scope 2', energyTypeSaved: 'Both',
  matchesFuelTypes: ['COAL_INDIAN', 'COKING_COAL', 'COKE', 'FURNACE_OIL', 'NATURAL_GAS'],
  matchesCategories: ['stationary_combustion', 'process'],
  matchesSubSectors: ['re_rolling', 'forging', 'casting_foundry', 'eaf_mini_mill'],
  co2ReductionMinPct: 20, co2ReductionMaxPct: 30,
  paybackMinYears: 2, paybackMaxYears: 5,
  capexMinLakhs: 10, capexMaxLakhs: 100,
});

const T003_BOILER = makeTech({
  id: 'tech-boiler', techId: 'T003', name: 'Energy Efficient Boilers',
  scopeAddressed: 'Scope 1', energyTypeSaved: 'Thermal',
  matchesFuelTypes: ['COAL_INDIAN', 'FURNACE_OIL', 'BIOMASS_WOOD'],
  matchesCategories: ['stationary_combustion'],
  matchesSubSectors: ['re_rolling', 'forging', 'casting_foundry'],
  co2ReductionMinPct: 15, co2ReductionMaxPct: 30,
});

const ALL_TECHS = [T001_VFD, T009_DBC, T010_ZIGZAG, T014_SAND, T015_SOLAR, T016_RESCO, T019_PNG, T020_BIOMASS, T004_WHRS, T003_BOILER];

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('Recommendation Engine', () => {
  // ── Agent 1: EAF Mini Mill ──
  describe('Agent 1: EAF Mini Mill matching', () => {
    const elecActivity = makeActivity({
      id: 'a-elec', scope: 2, sourceCategory: 'grid_electricity',
      fuelType: 'GRID_ELECTRICITY', quantity: 800000, unit: 'kWh',
    });
    const dieselActivity = makeActivity({
      id: 'a-diesel', scope: 1, sourceCategory: 'stationary_combustion',
      fuelType: 'DIESEL_HSD', quantity: 10, unit: 'kL',
    });
    const elecCalc = makeCalc('a-elec', 568); // 800,000 × 0.710/1000
    const dieselCalc = makeCalc('a-diesel', 27);

    it('should match VFDs, solar, RESCO for EAF with electricity', () => {
      const { matched, notApplicable } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'eaf_mini_mill' },
        activityData: [elecActivity, dieselActivity],
        calculations: [elecCalc, dieselCalc],
        allTechnologies: ALL_TECHS,
      });

      const matchedIds = matched.map(m => m.techId);
      expect(matchedIds).toContain('T001'); // VFDs
      expect(matchedIds).toContain('T015'); // Solar CAPEX
      expect(matchedIds).toContain('T016'); // Solar RESCO
      // WHRS does NOT match — DIESEL_HSD is not in WHRS matchesFuelTypes
      expect(matchedIds).not.toContain('T004');
    });

    it('should NOT match DBC (foundry only) or Zig-Zag (brick kilns)', () => {
      const { notApplicable } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'eaf_mini_mill' },
        activityData: [elecActivity, dieselActivity],
        calculations: [elecCalc, dieselCalc],
        allTechnologies: ALL_TECHS,
      });
      expect(notApplicable).toContain('T009'); // DBC — casting_foundry only
      expect(notApplicable).toContain('T010'); // Zig-Zag — brick_kilns
    });
  });

  // ── Agent 2: Foundry ──
  describe('Agent 2: Foundry (casting) matching', () => {
    const cokeActivity = makeActivity({
      id: 'a-coke', fuelType: 'COKE', sourceCategory: 'stationary_combustion', quantity: 50, unit: 'tonne',
    });
    const coalActivity = makeActivity({
      id: 'a-coal', fuelType: 'COAL_INDIAN', sourceCategory: 'stationary_combustion', quantity: 30, unit: 'tonne',
    });
    const elecActivity = makeActivity({
      id: 'a-elec2', scope: 2, fuelType: 'GRID_ELECTRICITY', sourceCategory: 'grid_electricity', quantity: 500000, unit: 'kWh',
    });
    const cokeCalc = makeCalc('a-coke', 150);
    const coalCalc = makeCalc('a-coal', 55);
    const elecCalc = makeCalc('a-elec2', 355);

    it('should match DBC for foundry with coke', () => {
      const { matched } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'casting_foundry' },
        activityData: [cokeActivity, coalActivity, elecActivity],
        calculations: [cokeCalc, coalCalc, elecCalc],
        allTechnologies: ALL_TECHS,
      });
      const ids = matched.map(m => m.techId);
      expect(ids).toContain('T009'); // DBC
      expect(ids).toContain('T014'); // Sand reclamation
      expect(ids).toContain('T001'); // VFDs
      expect(ids).toContain('T004'); // WHRS
      expect(ids).toContain('T015'); // Solar
    });
  });

  // ── Agent 3: Re-Rolling Mill ──
  describe('Agent 3: Re-Rolling Mill matching', () => {
    const coalActivity = makeActivity({
      id: 'a-coal3', fuelType: 'COAL_INDIAN', sourceCategory: 'stationary_combustion', quantity: 200, unit: 'tonne',
    });
    const foActivity = makeActivity({
      id: 'a-fo', fuelType: 'FURNACE_OIL', sourceCategory: 'stationary_combustion', quantity: 50, unit: 'kL',
    });
    const coalCalc = makeCalc('a-coal3', 365);
    const foCalc = makeCalc('a-fo', 152);

    it('should match PNG switch, biomass, WHRS, boilers for re-rolling', () => {
      const { matched } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 're_rolling' },
        activityData: [coalActivity, foActivity],
        calculations: [coalCalc, foCalc],
        allTechnologies: ALL_TECHS,
      });
      const ids = matched.map(m => m.techId);
      expect(ids).toContain('T019'); // PNG switch
      expect(ids).toContain('T020'); // Biomass
      expect(ids).toContain('T004'); // WHRS
      expect(ids).toContain('T003'); // EE Boilers
    });
  });

  // ── Agent 4: Impact Calculation ──
  describe('Agent 4: Impact calculation', () => {
    it('should calculate VFD reduction on 800,000 kWh (568 tCO2e matched)', () => {
      const matched: MatchedTechnology = {
        ...T001_VFD,
        matchedEmissionsTonnes: 568,
        matchedEnergyGj: 800000 * 0.0036, // 2880 GJ
        matchedFuelTypes: ['GRID_ELECTRICITY'],
        matchedCategories: ['grid_electricity'],
      };

      const impact = calculateTechImpact({
        technology: matched,
        grandTotal: 595, // 568 + 27 diesel
        facilityStates: ['Maharashtra'],
      });

      // reductionMin = 568 × 0.20 = 113.6
      expect(impact.reductionMinTonnes).toBeCloseTo(113.6, 1);
      // reductionMax = 568 × 0.40 = 227.2
      expect(impact.reductionMaxTonnes).toBeCloseTo(227.2, 1);
      // mid = (113.6 + 227.2) / 2 = 170.4
      expect(impact.reductionMidTonnes).toBeCloseTo(170.4, 1);
      // pctOfTotal = 170.4 / 595 × 100 ≈ 28.6%
      expect(impact.pctOfTotal).toBeCloseTo(28.6, 0);
    });
  });

  // ── Agent 5: Funding Matching ──
  describe('Agent 5: Funding matching', () => {
    const scheme1 = makeFunding({
      id: 'fund-adeetie', schemeId: 'S001', name: 'ADEETIE',
      turnoverBrackets: ['micro', 'small', 'medium'], status: 'Active',
    });
    const scheme2 = makeFunding({
      id: 'fund-sidbi', schemeId: 'S003', name: 'SIDBI PRSF',
      turnoverBrackets: ['small', 'medium'], status: 'Active',
    });
    const scheme3 = makeFunding({
      id: 'fund-eesl', schemeId: 'S010', name: 'EESL ESCO',
      turnoverBrackets: ['micro', 'small', 'medium'], status: 'Active',
    });
    const schemeConc = makeFunding({
      id: 'fund-concluded', schemeId: 'S099', name: 'Old Scheme',
      status: 'Concluded',
    });

    const links: TechFundingLinkData[] = [
      { techId: 'tech-vfd', fundingId: 'fund-adeetie', subsidyPct: 5, maxAmountLakhs: null, notes: null },
      { techId: 'tech-vfd', fundingId: 'fund-sidbi', subsidyPct: null, maxAmountLakhs: null, notes: null },
      { techId: 'tech-vfd', fundingId: 'fund-eesl', subsidyPct: null, maxAmountLakhs: null, notes: null },
      { techId: 'tech-vfd', fundingId: 'fund-concluded', subsidyPct: 10, maxAmountLakhs: null, notes: null },
    ];

    it('should return 3 active schemes for VFDs (micro enterprise in Maharashtra)', () => {
      const matches = matchFunding({
        techId: 'tech-vfd',
        capexMinLakhs: 1,
        capexMaxLakhs: 15,
        organisation: { turnoverBracket: 'micro', state: 'Maharashtra' },
        facilityStates: ['Maharashtra'],
        allFunding: [scheme1, scheme2, scheme3, schemeConc],
        allLinks: links,
      });
      // micro is excluded from SIDBI PRSF, so only ADEETIE + EESL = 2
      expect(matches.length).toBe(2);
      expect(matches.map(m => m.schemeId)).not.toContain('S099'); // concluded excluded
      expect(matches.map(m => m.schemeId)).not.toContain('S003'); // SIDBI excludes micro
    });

    it('should exclude SIDBI PRSF for micro (only small/medium)', () => {
      // SIDBI PRSF has turnoverBrackets: ['small', 'medium']
      const matches = matchFunding({
        techId: 'tech-vfd',
        capexMinLakhs: 1,
        capexMaxLakhs: 15,
        organisation: { turnoverBracket: 'micro', state: 'Maharashtra' },
        facilityStates: ['Maharashtra'],
        allFunding: [scheme1, scheme2, scheme3, schemeConc],
        allLinks: links,
      });
      // SIDBI should be excluded for micro
      // Actually, in our fixture SIDBI has turnoverBrackets: ['small', 'medium']
      // micro is NOT in ['small', 'medium'], so it should be filtered out
      expect(matches.find(m => m.schemeId === 'S003')).toBeUndefined();
    });

    it('should calculate ADEETIE net capex with 5% subsidy', () => {
      const matches = matchFunding({
        techId: 'tech-vfd',
        capexMinLakhs: 1,
        capexMaxLakhs: 15,
        organisation: { turnoverBracket: 'small', state: 'Maharashtra' },
        facilityStates: ['Maharashtra'],
        allFunding: [scheme1],
        allLinks: [links[0]],
      });
      const adeetie = matches.find(m => m.schemeId === 'S001')!;
      expect(adeetie.netCapexMinLakhs).toBeCloseTo(0.95, 2); // 1 × 0.95
      expect(adeetie.netCapexMaxLakhs).toBeCloseTo(14.25, 2); // 15 × 0.95
    });
  });

  // ── Agent 6: No Matches ──
  describe('Agent 6: No matches (Scope 3 only MSME)', () => {
    it('should return zero technologies for scope-3-only inventory', () => {
      const s3Activity = makeActivity({
        id: 'a-s3', scope: 3, sourceCategory: 'purchased_goods',
        fuelType: 'PURCHASED_STEEL', quantity: 100, unit: 'tonne',
      });
      const s3Calc = makeCalc('a-s3', 180);

      const { matched } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'induction_furnace' },
        activityData: [s3Activity],
        calculations: [s3Calc],
        allTechnologies: ALL_TECHS,
      });
      // All techs require Scope 1/2 fuel types — none match purchased_goods
      expect(matched.length).toBe(0);
    });
  });

  // ── Agent 7: Combination Impact (Sequential) ──
  describe('Agent 7: Combination impact — sequential, NOT additive', () => {
    it('should apply reductions sequentially (3 × 20% ≠ 60%)', () => {
      // Three identical technologies each reducing 20% of matched emissions
      // which equals the full baseline
      const tech1: TechImpact = {
        techId: 'T-A', name: 'Tech A', category: 'EE',
        reductionMinTonnes: 20, reductionMaxTonnes: 20, reductionMidTonnes: 20,
        energySavingMinGj: 0, energySavingMaxGj: 0,
        costSavingMinInr: 100000, costSavingMaxInr: 100000,
        capexMinLakhs: 5, capexMaxLakhs: 5,
        paybackMinYears: 1, paybackMaxYears: 1,
        paybackEstimateYears: 2.5,
        pctOfTotal: 20, matchedEmissionsTonnes: 100, matchedEnergyGj: 100,
        scopeAddressed: 'Scope 2', technologyReadiness: 'Commercially mature',
        demonstratedInIndia: true, description: '', source: '', sourceUrl: null,
        warnings: [], reductionSteps: [],
      };
      const tech2 = { ...tech1, techId: 'T-B', name: 'Tech B', paybackMinYears: 2 };
      const tech3 = { ...tech1, techId: 'T-C', name: 'Tech C', paybackMinYears: 3 };

      const combined = calculateCombinedImpact(
        [tech1, tech2, tech3],
        100, // baselineTotal
        50,  // scope1
        50,  // scope2
        0,   // scope3
      );

      // Sequential: 100 → 80 → 64 → 51.2
      // Total reduction = 48.8, NOT 60
      expect(combined.totalReductionTonnes).toBeCloseTo(48.8, 0);
      expect(combined.totalReductionPct).toBeCloseTo(48.8, 0);
      expect(combined.postReductionTotalTonnes).toBeCloseTo(51.2, 0);

      // Verify sequence
      expect(combined.technologySequence.length).toBe(3);
      expect(combined.technologySequence[0].reductionTonnes).toBeCloseTo(20, 0);
      expect(combined.technologySequence[0].residualAfterTonnes).toBeCloseTo(80, 0);
      expect(combined.technologySequence[1].reductionTonnes).toBeCloseTo(16, 0);
      expect(combined.technologySequence[1].residualAfterTonnes).toBeCloseTo(64, 0);
      expect(combined.technologySequence[2].reductionTonnes).toBeCloseTo(12.8, 0);
      expect(combined.technologySequence[2].residualAfterTonnes).toBeCloseTo(51.2, 0);
    });

    it('should not exceed 100% reduction', () => {
      const bigTech: TechImpact = {
        techId: 'T-BIG', name: 'Big Tech', category: 'EE',
        reductionMinTonnes: 80, reductionMaxTonnes: 80, reductionMidTonnes: 80,
        energySavingMinGj: 0, energySavingMaxGj: 0,
        costSavingMinInr: 0, costSavingMaxInr: 0,
        capexMinLakhs: 0, capexMaxLakhs: 0,
        paybackMinYears: 1, paybackMaxYears: 1,
        paybackEstimateYears: null,
        pctOfTotal: 80, matchedEmissionsTonnes: 100, matchedEnergyGj: 0,
        scopeAddressed: 'Scope 1', technologyReadiness: 'Commercially mature',
        demonstratedInIndia: true, description: '', source: '', sourceUrl: null,
        warnings: [], reductionSteps: [],
      };
      const bigTech2 = { ...bigTech, techId: 'T-BIG2', paybackMinYears: 2 };

      const combined = calculateCombinedImpact([bigTech, bigTech2], 100, 100, 0, 0);
      expect(combined.postReductionTotalTonnes).toBeGreaterThanOrEqual(0);
      expect(combined.totalReductionPct).toBeLessThanOrEqual(100);
    });
  });

  // ── Agent 8: Edge Cases ──
  describe('Agent 8: Edge cases', () => {
    it('should handle zero emissions gracefully', () => {
      const combined = calculateCombinedImpact([], 0, 0, 0, 0);
      expect(combined.totalReductionTonnes).toBe(0);
      expect(combined.postReductionTotalTonnes).toBe(0);
      expect(combined.technologySequence.length).toBe(0);
    });

    it('should handle missing subSector by matching techs with null matchesSubSectors', () => {
      const elecActivity = makeActivity({
        id: 'a-edge-elec', scope: 2, sourceCategory: 'grid_electricity',
        fuelType: 'GRID_ELECTRICITY', quantity: 100000, unit: 'kWh',
      });
      const calc = makeCalc('a-edge-elec', 71);

      // Solar has matchesSubSectors: null — should match any sub-sector
      const { matched } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'other' },
        activityData: [elecActivity],
        calculations: [calc],
        allTechnologies: [T015_SOLAR, T016_RESCO],
      });
      expect(matched.map(m => m.techId)).toContain('T015');
      expect(matched.map(m => m.techId)).toContain('T016');
    });

    it('should handle empty activity data', () => {
      const { matched } = matchTechnologies({
        organisation: { sector: 'iron_steel', subSector: 'eaf_mini_mill' },
        activityData: [],
        calculations: [],
        allTechnologies: ALL_TECHS,
      });
      expect(matched.length).toBe(0);
    });

    it('should return empty funding for tech with no links', () => {
      const matches = matchFunding({
        techId: 'nonexistent-tech-id',
        capexMinLakhs: 10,
        capexMaxLakhs: 20,
        organisation: { turnoverBracket: 'micro', state: 'Maharashtra' },
        facilityStates: ['Maharashtra'],
        allFunding: [],
        allLinks: [],
      });
      expect(matches.length).toBe(0);
    });
  });

  // ── Special Warning Tests ──
  describe('Special warnings', () => {
    it('should warn about PNG availability for non-CGD states', () => {
      const matched: MatchedTechnology = {
        ...T019_PNG,
        matchedEmissionsTonnes: 100,
        matchedEnergyGj: 50,
        matchedFuelTypes: ['COAL_INDIAN'],
        matchedCategories: ['stationary_combustion'],
      };
      const impact = calculateTechImpact({
        technology: matched,
        grandTotal: 200,
        facilityStates: ['Jharkhand'], // NOT in CGD list
      });
      expect(impact.warnings.some(w => w.includes('PNG may not be available'))).toBe(true);
    });

    it('should NOT warn about PNG for Gujarat (CGD state)', () => {
      const matched: MatchedTechnology = {
        ...T019_PNG,
        matchedEmissionsTonnes: 100,
        matchedEnergyGj: 50,
        matchedFuelTypes: ['COAL_INDIAN'],
        matchedCategories: ['stationary_combustion'],
      };
      const impact = calculateTechImpact({
        technology: matched,
        grandTotal: 200,
        facilityStates: ['Gujarat'],
      });
      expect(impact.warnings.some(w => w.includes('PNG may not be available'))).toBe(false);
    });
  });
});

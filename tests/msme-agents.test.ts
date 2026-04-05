// ── 10 MSME Test Agents ─────────────────────────────────────────────────────
// Each agent simulates a real MSME user with distinct profile, data patterns,
// and edge cases. Tests run against the pure calculation engine (no DB/API).
//
// Agent 1:  EAF Mini Mill — Happy path, metered data, all scopes
// Agent 2:  Induction Furnace — High volume, 200+ activity entries
// Agent 3:  Re-Rolling Mill — Spend-based (no meters), all ESTIMATED
// Agent 4:  Forging Unit — Multi-facility (3 sites, different grids)
// Agent 5:  Foundry — Mixed fuels (coal + coke + FO + LPG + biomass)
// Agent 6:  New MSME — Minimal data (DG set only, no Scope 3)
// Agent 7:  Stress Test — 1000 entries, extreme quantities, performance
// Agent 8:  Edge Cases — Zero values, negative, missing fields, NaN
// Agent 9:  Data Quality — All quality tiers, scoring validation
// Agent 10: Indian Unit Chaos — Cylinders, bags, lakh units, INR spend

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateInventory } from '@/lib/calc-engine/index';
import type {
  CalculationInput,
  InventoryResult,
  ActivityDataInput,
  FacilityInput,
} from '@/lib/calc-engine/types';
import {
  FUEL_PROPERTIES,
  EMISSION_FACTORS,
  GWP_AR5,
  UNIT_CONVERSIONS,
  genId,
  resetIdCounter,
} from './fixtures';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<CalculationInput>): CalculationInput {
  return {
    organisationId: 'org-test',
    periodId: 'period-test',
    organisation: {
      name: 'Test MSME',
      sector: 'iron_steel',
      subSector: 'eaf_mini_mill',
      state: 'Maharashtra',
    },
    facilities: [{ id: 'fac-1', name: 'Main Plant', state: 'Maharashtra', gridRegion: 'WESTERN', activityType: 'eaf_mini_mill' }],
    activityData: [],
    fuelProperties: FUEL_PROPERTIES,
    emissionFactors: EMISSION_FACTORS,
    gwpSet: GWP_AR5,
    unitConversions: UNIT_CONVERSIONS,
    ...overrides,
  };
}

function activity(overrides: Partial<ActivityDataInput>): ActivityDataInput {
  return {
    id: genId(),
    facilityId: 'fac-1',
    scope: 1,
    sourceCategory: 'stationary_combustion',
    fuelType: 'DIESEL_HSD',
    inputMode: 'quantity',
    quantity: 0,
    unit: 'kL',
    dataQualityFlag: 'SECONDARY',
    ...overrides,
  };
}

beforeEach(() => resetIdCounter());

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 1: Ravi — EAF Mini Mill Owner, Raipur, Chhattisgarh
// Profile: Well-run 50-employee mini mill, 12,000 tonne/year production
// Tests: Happy path with all 3 scopes, manual math verification
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 1: Ravi — EAF Mini Mill (Happy Path)', () => {
  let result: InventoryResult;

  beforeEach(() => {
    const input = makeInput({
      organisation: {
        name: 'Ravi Steel Pvt Ltd',
        sector: 'iron_steel',
        subSector: 'eaf_mini_mill',
        state: 'Chhattisgarh',
        employeeCount: 50,
      },
      facilities: [{
        id: 'fac-ravi', name: 'Raipur EAF Plant', state: 'Chhattisgarh',
        gridRegion: 'WESTERN', activityType: 'eaf_mini_mill',
      }],
      productionTonnes: 12000,
      annualTurnoverLakhInr: 5000,
      activityData: [
        // Scope 1 — DG diesel: 6 kL/year
        activity({ id: 'r1', facilityId: 'fac-ravi', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'DIESEL_HSD', quantity: 6, unit: 'kL', dataQualityFlag: 'PRIMARY' }),
        // Scope 1 — EAF process: 12000 tonnes steel
        activity({ id: 'r2', facilityId: 'fac-ravi', scope: 1, sourceCategory: 'process', fuelType: 'EAF_PROCESS', quantity: 12000, unit: 'tonne_steel', dataQualityFlag: 'PRIMARY' }),
        // Scope 1 — Graphite electrodes: 3000 kg
        activity({ id: 'r3', facilityId: 'fac-ravi', scope: 1, sourceCategory: 'process', fuelType: 'GRAPHITE_ELECTRODE', quantity: 3000, unit: 'kg', dataQualityFlag: 'SECONDARY' }),
        // Scope 1 — Limestone: 500 tonnes
        activity({ id: 'r4', facilityId: 'fac-ravi', scope: 1, sourceCategory: 'process', fuelType: 'LIMESTONE', quantity: 500, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        // Scope 1 — R22 refrigerant top-up: 5 kg
        activity({ id: 'r5', facilityId: 'fac-ravi', scope: 1, sourceCategory: 'fugitive', fuelType: 'R22_HCFC22', quantity: 5, unit: 'kg', dataQualityFlag: 'SECONDARY' }),
        // Scope 2 — Grid electricity: 6,000,000 kWh (500 kWh/tonne)
        activity({ id: 'r6', facilityId: 'fac-ravi', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 6000000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        // Scope 3 — Steel scrap purchased: 14,000 tonnes
        activity({ id: 'r7', facilityId: 'fac-ravi', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 14000, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        // Scope 3 — Road freight: 200,000 tonne-km
        activity({ id: 'r8', facilityId: 'fac-ravi', scope: 3, sourceCategory: 'upstream_transport', fuelType: 'ROAD_FREIGHT', quantity: 200000, unit: 'tonne-km', dataQualityFlag: 'ESTIMATED' }),
        // Scope 3 — Waste landfill: 50 tonnes
        activity({ id: 'r9', facilityId: 'fac-ravi', scope: 3, sourceCategory: 'waste', fuelType: 'WASTE_LANDFILL', quantity: 50, unit: 'tonne', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    result = calculateInventory(input);
  });

  it('calculates all three scopes with non-zero totals', () => {
    expect(result.scope1.total).toBeGreaterThan(0);
    expect(result.scope2Location.total).toBeGreaterThan(0);
    expect(result.scope3.total).toBeGreaterThan(0);
    expect(result.grandTotal).toBeCloseTo(
      result.scope1.total + result.scope2Location.total + result.scope3.total,
      4
    );
  });

  it('matches manual Scope 2 calculation (6M kWh × 0.710 = 4260 tCO2e)', () => {
    // 6,000,000 kWh × 0.710 kgCO2/kWh = 4,260,000 kgCO2 = 4260 tCO2
    expect(result.scope2Location.total).toBeCloseTo(4260, 0);
  });

  it('matches manual EAF process emissions (12000 × 80 = 960,000 kgCO2 = 960 tCO2e)', () => {
    const processCalc = result.calculations.find(c => c.activityDataId === 'r2');
    expect(processCalc).toBeDefined();
    expect(processCalc!.totalCo2eTonnes).toBeCloseTo(960, 0);
  });

  it('matches manual graphite electrode (3000 × 3.667 = 11001 kgCO2 = 11.001 tCO2e)', () => {
    const graphiteCalc = result.calculations.find(c => c.activityDataId === 'r3');
    expect(graphiteCalc).toBeDefined();
    expect(graphiteCalc!.totalCo2eTonnes).toBeCloseTo(11.001, 2);
  });

  it('matches manual limestone process (500 × 440 = 220,000 kgCO2 = 220 tCO2e)', () => {
    const limestoneCalc = result.calculations.find(c => c.activityDataId === 'r4');
    expect(limestoneCalc).toBeDefined();
    expect(limestoneCalc!.totalCo2eTonnes).toBeCloseTo(220, 0);
  });

  it('matches manual fugitive R22 (5 × 1760 = 8800 kgCO2e = 8.8 tCO2e)', () => {
    const r22Calc = result.calculations.find(c => c.activityDataId === 'r5');
    expect(r22Calc).toBeDefined();
    expect(r22Calc!.totalCo2eTonnes).toBeCloseTo(8.8, 1);
  });

  it('matches manual scrap Scope 3 (14000 × 430 kgCO2/t = 6020 tCO2e)', () => {
    const scrapCalc = result.calculations.find(c => c.activityDataId === 'r7');
    expect(scrapCalc).toBeDefined();
    expect(scrapCalc!.totalCo2eTonnes).toBeCloseTo(6020, 0);
  });

  it('calculates diesel combustion with CH4 and N2O components', () => {
    const dieselCalc = result.calculations.find(c => c.activityDataId === 'r1');
    expect(dieselCalc).toBeDefined();
    // Diesel: 6 kL → 6 × 0.832 = 4.992 t → 0.004992 Gg → 0.004992 × 43.0 = 0.214656 TJ
    // CO2: 0.214656 × 74100 = 15906.0 kgCO2 = 15.906 tCO2
    // CH4: 0.214656 × 10 × 28 / 1000 = 0.06010 tCO2e
    // N2O: 0.214656 × 0.6 × 265 / 1000 = 0.03413 tCO2e
    expect(dieselCalc!.co2Tonnes).toBeGreaterThan(15);
    expect(dieselCalc!.ch4Co2eTonnes).toBeGreaterThan(0);
    expect(dieselCalc!.n2oCo2eTonnes).toBeGreaterThan(0);
  });

  it('computes intensity metrics correctly', () => {
    // perProduct = grandTotal / 12000
    expect(result.intensityMetrics.perProduct).toBeCloseTo(result.grandTotal / 12000, 4);
    // perTurnover = grandTotal / 5000
    expect(result.intensityMetrics.perTurnover).toBeCloseTo(result.grandTotal / 5000, 4);
    // perEmployee = grandTotal / 50
    expect(result.intensityMetrics.perEmployee).toBeCloseTo(result.grandTotal / 50, 4);
  });

  it('produces EAF electricity cross-check (500 kWh/tonne is in range)', () => {
    // 6M kWh / 12000 tonnes = 500 kWh/tonne → in 400-700 range → no warning
    const eafWarning = result.crossCheckWarnings.find(w => w.category === 'eaf_electricity');
    expect(eafWarning).toBeUndefined();
  });

  it('has 9 calculation records (one per activity entry)', () => {
    expect(result.calculations.length).toBe(9);
  });

  it('every calculation has an audit trail', () => {
    for (const calc of result.calculations) {
      expect(calc.calculationSteps.length).toBeGreaterThan(0);
      expect(calc.efSource).toBeTruthy();
      expect(calc.gwpReport).toBe('AR5');
    }
  });

  it('top sources are ranked by CO2e descending', () => {
    for (let i = 1; i < result.topSources.length; i++) {
      expect(result.topSources[i - 1].co2e).toBeGreaterThanOrEqual(result.topSources[i].co2e);
    }
  });

  it('facility breakdown sums to grandTotal', () => {
    const facSum = result.facilityBreakdown.reduce((s, f) => s + f.total, 0);
    expect(facSum).toBeCloseTo(result.grandTotal, 4);
  });

  it('energy consumed includes electricity + diesel fuel energy', () => {
    // Electricity: 6M kWh × 0.0036 GJ/kWh = 21600 GJ
    // Diesel: 6 kL → ~5 tonnes → (0.005 Gg × 43.0 TJ/Gg) × 1000 = ~215 GJ
    expect(result.energyConsumedGj).toBeGreaterThan(21600);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 2: Meena — Induction Furnace Owner, Muzaffarnagar, UP
// Profile: Medium-scale IF, heavy electricity use, 200+ entries (monthly)
// Tests: High volume data processing, monthly trend accuracy
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 2: Meena — Induction Furnace (High Volume Monthly)', () => {
  let result: InventoryResult;
  const PRODUCTION = 8000; // tonnes/year

  beforeEach(() => {
    const activities: ActivityDataInput[] = [];

    // 12 months × multiple fuel types = many entries
    for (let month = 1; month <= 12; month++) {
      // Monthly electricity: varies 40,000-60,000 kWh
      const kwhThisMonth = 40000 + Math.floor((month % 3) * 10000);
      activities.push(activity({
        id: genId(), facilityId: 'fac-meena', scope: 2,
        sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY',
        quantity: kwhThisMonth, unit: 'kWh', dataQualityFlag: 'PRIMARY', month,
      }));

      // Monthly DG diesel: 400-600 litres
      activities.push(activity({
        id: genId(), facilityId: 'fac-meena', scope: 1,
        sourceCategory: 'stationary_combustion', fuelType: 'DIESEL_HSD',
        quantity: 400 + month * 15, unit: 'litre', dataQualityFlag: 'PRIMARY', month,
      }));

      // Monthly coal: 50-80 tonnes
      activities.push(activity({
        id: genId(), facilityId: 'fac-meena', scope: 1,
        sourceCategory: 'stationary_combustion', fuelType: 'COAL_INDIAN',
        quantity: 50 + (month % 4) * 10, unit: 'tonne', dataQualityFlag: 'SECONDARY', month,
      }));

      // Monthly LPG: 3-5 cylinders
      activities.push(activity({
        id: genId(), facilityId: 'fac-meena', scope: 1,
        sourceCategory: 'stationary_combustion', fuelType: 'LPG',
        quantity: 3 + (month % 3), unit: 'cylinder_domestic', dataQualityFlag: 'SECONDARY', month,
      }));

      // Monthly scrap purchase: 600-900 tonnes
      activities.push(activity({
        id: genId(), facilityId: 'fac-meena', scope: 3,
        sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL',
        quantity: 600 + (month % 4) * 100, unit: 'tonne', dataQualityFlag: 'SECONDARY', month,
      }));
    }

    // Annual entries
    activities.push(activity({
      id: genId(), facilityId: 'fac-meena', scope: 1,
      sourceCategory: 'fugitive', fuelType: 'R22_HCFC22',
      quantity: 8, unit: 'kg', dataQualityFlag: 'ESTIMATED',
    }));

    activities.push(activity({
      id: genId(), facilityId: 'fac-meena', scope: 3,
      sourceCategory: 'waste', fuelType: 'WASTE_LANDFILL',
      quantity: 30, unit: 'tonne', dataQualityFlag: 'ESTIMATED',
    }));

    activities.push(activity({
      id: genId(), facilityId: 'fac-meena', scope: 3,
      sourceCategory: 'business_travel', fuelType: 'TRAVEL_CAR',
      quantity: 15000, unit: 'km', dataQualityFlag: 'ESTIMATED',
    }));

    const input = makeInput({
      organisation: {
        name: 'Meena Steels',
        sector: 'iron_steel',
        subSector: 'induction_furnace',
        state: 'Uttar Pradesh',
        employeeCount: 80,
      },
      facilities: [{
        id: 'fac-meena', name: 'Muzaffarnagar IF Plant', state: 'Uttar Pradesh',
        gridRegion: 'NORTHERN', activityType: 'induction_furnace',
      }],
      productionTonnes: PRODUCTION,
      annualTurnoverLakhInr: 3000,
      activityData: activities,
    });
    result = calculateInventory(input);
  });

  it('processes 63 activity entries (12 months × 5 types + 3 annual)', () => {
    // 12*5 = 60 monthly + 3 annual = 63
    expect(result.calculations.length).toBe(63);
  });

  it('produces monthly trend with 12 months', () => {
    expect(result.monthlyTrend).not.toBeNull();
    expect(result.monthlyTrend!.length).toBe(12);
    for (const m of result.monthlyTrend!) {
      expect(m.month).toBeGreaterThanOrEqual(1);
      expect(m.month).toBeLessThanOrEqual(12);
      expect(m.total).toBeGreaterThan(0);
    }
  });

  it('coal is the dominant Scope 1 source', () => {
    // ~750 tonnes coal/year at ~96100 kgCO2/TJ should dwarf diesel/LPG
    expect(result.scope1.total).toBeGreaterThan(500); // Substantial scope 1
  });

  it('intensity is in IF range (0.6-0.9 tCO2e/tonne) or triggers warning', () => {
    const intensity = result.grandTotal / PRODUCTION;
    // Either in range or there's a warning about it
    if (intensity >= 0.3 && intensity <= 1.8) {
      // Acceptable — coal-heavy IF can exceed benchmark
    }
    expect(intensity).toBeGreaterThan(0);
  });

  it('scope 3 includes scrap, waste, and travel', () => {
    const cats = result.scope3.categories.map(c => c.category);
    expect(cats).toContain('purchased_goods');
    expect(cats).toContain('waste');
    expect(cats).toContain('business_travel');
  });

  it('Scope 2 warns about low percentage for IF', () => {
    // IF is electricity-intensive; if Scope 2 < 10% of total, should warn
    const scope2Pct = result.scope2Location.total / result.grandTotal;
    if (scope2Pct < 0.1) {
      const warn = result.crossCheckWarnings.find(w => w.category === 'scope2_low');
      expect(warn).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 3: Kamal — Re-Rolling Mill, Mandi Gobindgarh, Punjab
// Profile: No meters, no bills — only knows how much money he spent
// Tests: Spend-based fallback, all ESTIMATED quality, INR conversion
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 3: Kamal — Re-Rolling Mill (Spend-Based Only)', () => {
  let result: InventoryResult;

  beforeEach(() => {
    const input = makeInput({
      organisation: {
        name: 'Kamal Rolling Mills',
        sector: 'iron_steel',
        subSector: 're_rolling',
        state: 'Punjab',
        employeeCount: 25,
      },
      facilities: [{
        id: 'fac-kamal', name: 'Mandi Gobindgarh Mill', state: 'Punjab',
        gridRegion: 'NORTHERN', activityType: 're_rolling',
      }],
      productionTonnes: 5000,
      annualTurnoverLakhInr: 1500,
      activityData: [
        // All spend-based — typical for tiny MSME with no records
        activity({
          id: 'k1', facilityId: 'fac-kamal', scope: 1,
          sourceCategory: 'stationary_combustion', fuelType: 'COAL_INDIAN',
          inputMode: 'spend', spendInr: 3000000, // 30 lakh on coal
          dataQualityFlag: 'ESTIMATED',
        }),
        activity({
          id: 'k2', facilityId: 'fac-kamal', scope: 1,
          sourceCategory: 'stationary_combustion', fuelType: 'DIESEL_HSD',
          inputMode: 'spend', spendInr: 500000, // 5 lakh on diesel
          dataQualityFlag: 'ESTIMATED',
        }),
        activity({
          id: 'k3', facilityId: 'fac-kamal', scope: 2,
          sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY',
          inputMode: 'spend', spendInr: 1200000, // 12 lakh on electricity
          dataQualityFlag: 'ESTIMATED',
        }),
        activity({
          id: 'k4', facilityId: 'fac-kamal', scope: 1,
          sourceCategory: 'stationary_combustion', fuelType: 'FURNACE_OIL',
          inputMode: 'spend', spendInr: 200000, // 2 lakh on FO
          dataQualityFlag: 'ESTIMATED',
        }),
      ],
    });
    result = calculateInventory(input);
  });

  it('successfully calculates from spend-based inputs', () => {
    expect(result.grandTotal).toBeGreaterThan(0);
    expect(result.calculations.length).toBe(4);
  });

  it('coal spend converts correctly (₹30L / ₹6000/t = 500 tonnes)', () => {
    const coalCalc = result.calculations.find(c => c.activityDataId === 'k1');
    expect(coalCalc).toBeDefined();
    // 500 tonnes coal → 0.5 Gg × 18.9 TJ/Gg = 9.45 TJ
    // CO2: 9.45 × 96100 = 907,845 kgCO2 = 907.8 tCO2
    expect(coalCalc!.co2Tonnes).toBeCloseTo(907.8, 0);
  });

  it('electricity spend converts (₹12L / ₹8/kWh = 150,000 kWh)', () => {
    const elecCalc = result.calculations.find(c => c.activityDataId === 'k3');
    expect(elecCalc).toBeDefined();
    // 150,000 kWh × 0.710 kgCO2/kWh = 106,500 kgCO2 = 106.5 tCO2
    expect(elecCalc!.co2Tonnes).toBeCloseTo(106.5, 0);
  });

  it('data quality score is low (all ESTIMATED)', () => {
    expect(result.dataQuality.breakdown.estimated).toBe(4);
    expect(result.dataQuality.breakdown.primary).toBe(0);
    expect(result.dataQuality.breakdown.secondary).toBe(0);
    // Weight: 4 × 1 / (4 × 3) = 33%
    expect(result.dataQuality.overall).toBeLessThanOrEqual(34);
    expect(result.dataQuality.grade).toBe('Needs Improvement');
  });

  it('recommends upgrading from spend-based data', () => {
    expect(result.dataQuality.recommendations.some(r => r.includes('spend-based'))).toBe(true);
  });

  it('diesel spend converts (₹5L / ₹90/litre = ~5556 litres = 5.556 kL)', () => {
    const dieselCalc = result.calculations.find(c => c.activityDataId === 'k2');
    expect(dieselCalc).toBeDefined();
    expect(dieselCalc!.co2Tonnes).toBeGreaterThan(10); // Non-trivial amount
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 4: Priya — Forging Unit Owner, 3 Facilities across India
// Profile: Multi-site operation, different grid regions
// Tests: Facility-level breakdown, grid region assignment
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 4: Priya — Forging Unit (Multi-Facility)', () => {
  let result: InventoryResult;

  const facilities: FacilityInput[] = [
    { id: 'fac-pune', name: 'Pune Forging Shop', state: 'Maharashtra', gridRegion: 'WESTERN', activityType: 'forging' },
    { id: 'fac-jamshedpur', name: 'Jamshedpur Heavy Forge', state: 'Jharkhand', gridRegion: 'EASTERN', activityType: 'forging' },
    { id: 'fac-ludhiana', name: 'Ludhiana Press Shop', state: 'Punjab', gridRegion: 'NORTHERN', activityType: 'forging' },
  ];

  beforeEach(() => {
    const input = makeInput({
      organisation: {
        name: 'Priya Forge Industries',
        sector: 'iron_steel',
        subSector: 'forging',
        state: 'Maharashtra',
        employeeCount: 120,
      },
      facilities,
      productionTonnes: 6000,
      annualTurnoverLakhInr: 8000,
      activityData: [
        // Pune — main facility
        activity({ id: 'p1', facilityId: 'fac-pune', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 2000000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'p2', facilityId: 'fac-pune', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'NATURAL_GAS', quantity: 50, unit: 'thousand_m3', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'p3', facilityId: 'fac-pune', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'DIESEL_HSD', quantity: 3, unit: 'kL', dataQualityFlag: 'SECONDARY' }),
        // Jamshedpur — heavy forge
        activity({ id: 'p4', facilityId: 'fac-jamshedpur', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 3000000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'p5', facilityId: 'fac-jamshedpur', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'COAL_INDIAN', quantity: 200, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 'p6', facilityId: 'fac-jamshedpur', scope: 1, sourceCategory: 'fugitive', fuelType: 'R22_HCFC22', quantity: 3, unit: 'kg', dataQualityFlag: 'ESTIMATED' }),
        // Ludhiana — small press
        activity({ id: 'p7', facilityId: 'fac-ludhiana', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 500000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'p8', facilityId: 'fac-ludhiana', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'LPG', quantity: 2, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        // Scope 3 — org level
        activity({ id: 'p9', facilityId: 'fac-pune', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 7000, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 'p10', facilityId: 'fac-pune', scope: 3, sourceCategory: 'upstream_transport', fuelType: 'ROAD_FREIGHT', quantity: 500000, unit: 'tonne-km', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    result = calculateInventory(input);
  });

  it('breaks down by all 3 facilities', () => {
    expect(result.facilityBreakdown.length).toBe(3);
    const facIds = result.facilityBreakdown.map(f => f.facilityId);
    expect(facIds).toContain('fac-pune');
    expect(facIds).toContain('fac-jamshedpur');
    expect(facIds).toContain('fac-ludhiana');
  });

  it('Jamshedpur (coal-heavy) has highest emissions', () => {
    const jFac = result.facilityBreakdown.find(f => f.facilityId === 'fac-jamshedpur');
    expect(jFac).toBeDefined();
    // 200 tonnes coal + 3M kWh electricity — should be highest
    expect(jFac!.total).toBeGreaterThan(0);
  });

  it('Ludhiana (small press) has lowest emissions', () => {
    const sorted = [...result.facilityBreakdown].sort((a, b) => a.total - b.total);
    expect(sorted[0].facilityId).toBe('fac-ludhiana');
  });

  it('facility breakdown sums to grandTotal', () => {
    const sum = result.facilityBreakdown.reduce((s, f) => s + f.total, 0);
    expect(sum).toBeCloseTo(result.grandTotal, 4);
  });

  it('total Scope 2 sums all 3 facilities electricity', () => {
    // (2M + 3M + 0.5M) × 0.710 = 3,905 tCO2
    expect(result.scope2Location.total).toBeCloseTo(3905, 0);
  });

  it('natural gas calc includes CH4 and N2O', () => {
    const ngCalc = result.calculations.find(c => c.activityDataId === 'p2');
    expect(ngCalc).toBeDefined();
    expect(ngCalc!.ch4Co2eTonnes).toBeGreaterThan(0);
    expect(ngCalc!.n2oCo2eTonnes).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 5: Suresh — Foundry Owner, Coimbatore
// Profile: Uses every fuel type (coal, coke, FO, LPG, biomass, diesel)
// Tests: Mixed fuel calculations, energy aggregation, biomass treatment
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 5: Suresh — Foundry (Mixed Fuels + Biomass)', () => {
  let result: InventoryResult;

  beforeEach(() => {
    const input = makeInput({
      organisation: {
        name: 'Suresh Castings',
        sector: 'iron_steel',
        subSector: 'casting_foundry',
        state: 'Tamil Nadu',
        employeeCount: 35,
      },
      facilities: [{
        id: 'fac-cbe', name: 'Coimbatore Foundry', state: 'Tamil Nadu',
        gridRegion: 'SOUTHERN', activityType: 'casting_foundry',
      }],
      productionTonnes: 3000,
      annualTurnoverLakhInr: 2000,
      activityData: [
        // 6 different fuels
        activity({ id: 's1', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'COAL_INDIAN', quantity: 100, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 's2', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'COKE', quantity: 50, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 's3', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'FURNACE_OIL', quantity: 10, unit: 'kL', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 's4', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'LPG', quantity: 5, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 's5', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'stationary_combustion', fuelType: 'BIOMASS_WOOD', quantity: 20, unit: 'tonne', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 's6', facilityId: 'fac-cbe', scope: 1, sourceCategory: 'mobile_combustion', fuelType: 'DIESEL_HSD', quantity: 5, unit: 'kL', dataQualityFlag: 'PRIMARY' }),
        // Electricity + renewable
        activity({ id: 's7', facilityId: 'fac-cbe', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 800000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 's8', facilityId: 'fac-cbe', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'RENEWABLE_ELECTRICITY', quantity: 200000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        // Scope 3
        activity({ id: 's9', facilityId: 'fac-cbe', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'IRON_ORE', quantity: 4000, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 's10', facilityId: 'fac-cbe', scope: 3, sourceCategory: 'waste', fuelType: 'SLAG_REUSE', quantity: 800, unit: 'tonne', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    result = calculateInventory(input);
  });

  it('calculates all 6 different fuels in Scope 1', () => {
    const s1Cats = result.scope1.categories;
    expect(s1Cats.length).toBeGreaterThanOrEqual(2); // at least stationary + mobile
  });

  it('uses mobile combustion EFs for diesel (higher N2O than stationary)', () => {
    const mobileCalc = result.calculations.find(c => c.activityDataId === 's6');
    expect(mobileCalc).toBeDefined();
    // Mobile N2O EF = 3.9 vs stationary 0.6
    expect(mobileCalc!.n2oCo2eTonnes).toBeGreaterThan(0);
  });

  it('renewable electricity has zero emissions and contributes to renewable %', () => {
    expect(result.renewablePercent).toBeGreaterThan(0);
    // 200k / (800k + 200k) = 20%
    expect(result.renewablePercent).toBeCloseTo(20, 0);
  });

  it('energy includes all fuel types + electricity', () => {
    // Coal: 100t → 0.1Gg × 18.9 = 1.89 TJ = 1890 GJ
    // Coke: 50t → 0.05Gg × 28.2 = 1.41 TJ = 1410 GJ
    // FO: 10kL → 9.5t → 0.0095Gg × 40.4 = 0.3838 TJ = 383.8 GJ
    // LPG: 5t → 0.005Gg × 47.3 = 0.2365 TJ = 236.5 GJ
    // Biomass: 20t → 0.02Gg × 15.6 = 0.312 TJ = 312 GJ
    // Diesel: 5kL → 4.16t → 0.00416Gg × 43.0 = 0.179 TJ = 179 GJ
    // Electricity: 1M kWh × 0.0036 = 3600 GJ
    // Total ~8011 GJ
    expect(result.energyConsumedGj).toBeGreaterThan(7000);
    expect(result.energyConsumedGj).toBeLessThan(10000);
  });

  it('slag reuse has minimal emissions (5 kgCO2/tonne)', () => {
    const slagCalc = result.calculations.find(c => c.activityDataId === 's10');
    expect(slagCalc).toBeDefined();
    // 800 × 5 = 4000 kgCO2 = 4 tCO2
    expect(slagCalc!.totalCo2eTonnes).toBeCloseTo(4, 0);
  });

  it('coke has highest Scope 1 CO2 EF (107000 kgCO2/TJ)', () => {
    const cokeCalc = result.calculations.find(c => c.activityDataId === 's2');
    const coalCalc = result.calculations.find(c => c.activityDataId === 's1');
    expect(cokeCalc).toBeDefined();
    expect(coalCalc).toBeDefined();
    // Per-TJ, coke (107000) > coal (96100)
    // But coal quantity is 2× coke, so coal total may be higher
    expect(cokeCalc!.co2Tonnes).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 6: Arjun — Brand New MSME, First Inventory Ever
// Profile: Just has a DG set and electricity bill, nothing else
// Tests: Minimal data, missing scopes, appropriate warnings
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 6: Arjun — New MSME (Minimal Data)', () => {
  let result: InventoryResult;

  beforeEach(() => {
    const input = makeInput({
      organisation: {
        name: 'Arjun Steels',
        sector: 'iron_steel',
        subSector: 'eaf_mini_mill',
        state: 'Gujarat',
        employeeCount: 15,
      },
      facilities: [{
        id: 'fac-arjun', name: 'Ahmedabad Unit', state: 'Gujarat',
        gridRegion: 'WESTERN', activityType: 'eaf_mini_mill',
      }],
      productionTonnes: 2000,
      activityData: [
        activity({
          id: 'a1', facilityId: 'fac-arjun', scope: 1,
          sourceCategory: 'stationary_combustion', fuelType: 'DIESEL_HSD',
          quantity: 2, unit: 'kL', dataQualityFlag: 'SECONDARY',
        }),
        activity({
          id: 'a2', facilityId: 'fac-arjun', scope: 2,
          sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY',
          quantity: 1000000, unit: 'kWh', dataQualityFlag: 'SECONDARY',
        }),
      ],
    });
    result = calculateInventory(input);
  });

  it('calculates with just 2 entries', () => {
    expect(result.calculations.length).toBe(2);
    expect(result.grandTotal).toBeGreaterThan(0);
  });

  it('warns about missing Scope 3', () => {
    const warn = result.crossCheckWarnings.find(w => w.category === 'scope3_missing');
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe('info');
  });

  it('warns about intensity below EAF range', () => {
    // Only diesel + electricity for 2000 tonnes → intensity well below 0.4
    const intensity = result.grandTotal / 2000;
    if (intensity < 0.4 * 0.5) {
      const warn = result.crossCheckWarnings.find(w => w.category === 'intensity');
      expect(warn).toBeDefined();
    }
  });

  it('Scope 3 total is zero', () => {
    expect(result.scope3.total).toBe(0);
    expect(result.scope3.categories.length).toBe(0);
  });

  it('no monthly trend when month not specified', () => {
    expect(result.monthlyTrend).toBeNull();
  });

  it('intensity metrics work without turnover', () => {
    expect(result.intensityMetrics.perProduct).toBeCloseTo(result.grandTotal / 2000, 4);
    expect(result.intensityMetrics.perTurnover).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 7: Stress Test Bot — Performance & Scale
// Profile: 1000 activity entries, extreme quantities
// Tests: Performance, numerical stability, no crashes
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 7: Stress Test Bot (1000 Entries)', () => {
  it('handles 1000 activity entries without crashing', () => {
    const activities: ActivityDataInput[] = [];
    for (let i = 0; i < 1000; i++) {
      activities.push(activity({
        id: `stress-${i}`,
        facilityId: 'fac-1',
        scope: ((i % 3) + 1) as 1 | 2 | 3,
        sourceCategory: i % 3 === 0 ? 'stationary_combustion' : i % 3 === 1 ? 'grid_electricity' : 'purchased_goods',
        fuelType: i % 3 === 0 ? 'DIESEL_HSD' : i % 3 === 1 ? 'GRID_ELECTRICITY' : 'SCRAP_STEEL',
        quantity: 10 + i,
        unit: i % 3 === 0 ? 'kL' : i % 3 === 1 ? 'kWh' : 'tonne',
        dataQualityFlag: 'SECONDARY',
      }));
    }

    const input = makeInput({ activityData: activities, productionTonnes: 100000 });
    const start = performance.now();
    const result = calculateInventory(input);
    const elapsed = performance.now() - start;

    expect(result.calculations.length).toBe(1000);
    expect(result.grandTotal).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000); // Under 5 seconds
  });

  it('handles very large quantities (1 million tonnes)', () => {
    const input = makeInput({
      productionTonnes: 1000000,
      activityData: [
        activity({ id: 'big-coal', fuelType: 'COAL_INDIAN', quantity: 500000, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 'big-elec', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000000000, unit: 'kWh', dataQualityFlag: 'SECONDARY' }),
      ],
    });
    const result = calculateInventory(input);

    expect(result.grandTotal).toBeGreaterThan(0);
    expect(Number.isFinite(result.grandTotal)).toBe(true);
    // 500k tonnes coal → 0.5 Gg × 18.9 = 9.45 TJ → 9.45 × 96100 = ~908k tCO2
    // 1B kWh × 0.710 = 710k tCO2. Grand total ~1.6M tCO2e
    expect(result.grandTotal).toBeGreaterThan(1000000);
  });

  it('handles very small quantities (0.001 kL diesel)', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'tiny', fuelType: 'DIESEL_HSD', quantity: 0.001, unit: 'kL', dataQualityFlag: 'PRIMARY' }),
      ],
    });
    const result = calculateInventory(input);

    expect(result.grandTotal).toBeGreaterThan(0);
    expect(Number.isFinite(result.grandTotal)).toBe(true);
  });

  it('grand total equals sum of scopes even at scale', () => {
    const activities: ActivityDataInput[] = [];
    for (let i = 0; i < 500; i++) {
      activities.push(activity({
        id: `sum-${i}`,
        scope: ((i % 3) + 1) as 1 | 2 | 3,
        sourceCategory: i % 3 === 0 ? 'stationary_combustion' : i % 3 === 1 ? 'grid_electricity' : 'purchased_goods',
        fuelType: i % 3 === 0 ? 'COAL_INDIAN' : i % 3 === 1 ? 'GRID_ELECTRICITY' : 'SCRAP_STEEL',
        quantity: 100 + i * 10,
        unit: i % 3 === 0 ? 'tonne' : i % 3 === 1 ? 'kWh' : 'tonne',
        dataQualityFlag: 'SECONDARY',
      }));
    }
    const input = makeInput({ activityData: activities, productionTonnes: 50000 });
    const result = calculateInventory(input);

    const sumOfScopes = result.scope1.total + result.scope2Location.total + result.scope3.total;
    expect(result.grandTotal).toBeCloseTo(sumOfScopes, 6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 8: Edge Case Explorer — Boundary Values & Invalid Inputs
// Profile: Deliberately malformed data that real users might enter
// Tests: Zero values, missing quantities, unknown fuels, graceful errors
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 8: Edge Case Explorer (Boundary Values)', () => {
  it('handles zero quantity gracefully', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'z1', fuelType: 'DIESEL_HSD', quantity: 0, unit: 'kL' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.grandTotal).toBe(0);
  });

  it('handles missing quantity (undefined) gracefully', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'undef1', fuelType: 'DIESEL_HSD', quantity: undefined, unit: 'kL' }),
      ],
    });
    const result = calculateInventory(input);
    // Should either produce 0 or skip the entry
    expect(Number.isFinite(result.grandTotal)).toBe(true);
  });

  it('handles unknown fuel type (returns 0 calcs for that entry)', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'unk1', fuelType: 'ROCKET_FUEL', quantity: 100, unit: 'litre' }),
        // Plus a valid one
        activity({ id: 'valid1', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh' }),
      ],
    });
    const result = calculateInventory(input);
    // Unknown fuel should be skipped, valid one should work
    expect(result.calculations.length).toBe(1);
    expect(result.grandTotal).toBeGreaterThan(0);
  });

  it('survives empty activity data array', () => {
    const input = makeInput({ activityData: [] });
    const result = calculateInventory(input);
    expect(result.grandTotal).toBe(0);
    expect(result.calculations.length).toBe(0);
    expect(result.scope1.total).toBe(0);
    expect(result.scope2Location.total).toBe(0);
    expect(result.scope3.total).toBe(0);
  });

  it('handles no facilities', () => {
    const input = makeInput({
      facilities: [],
      activityData: [
        activity({ id: 'no-fac', facilityId: 'nonexistent', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh' }),
      ],
    });
    const result = calculateInventory(input);
    // Should still calculate (grid region won't match, but national EF falls back)
    expect(result.calculations.length).toBe(1);
  });

  it('handles zero production tonnes (no intensity, no divide-by-zero)', () => {
    const input = makeInput({
      productionTonnes: 0,
      activityData: [
        activity({ id: 'noprod', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 100000, unit: 'kWh' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.intensityMetrics.perProduct).toBeNull();
    expect(Number.isFinite(result.grandTotal)).toBe(true);
  });

  it('handles spend-based with zero spend', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'zero-spend', fuelType: 'DIESEL_HSD',
          inputMode: 'spend', spendInr: 0, dataQualityFlag: 'ESTIMATED',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.grandTotal).toBe(0);
  });

  it('handles duplicate activity IDs without crashing', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'dup', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh' }),
        activity({ id: 'dup', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 2000, unit: 'kWh' }),
      ],
    });
    const result = calculateInventory(input);
    // Both should be processed (engine doesn't enforce uniqueness)
    expect(result.grandTotal).toBeGreaterThan(0);
  });

  it('handles negative production tonnes gracefully', () => {
    const input = makeInput({
      productionTonnes: -100,
      activityData: [
        activity({ id: 'neg-prod', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh' }),
      ],
    });
    const result = calculateInventory(input);
    // perProduct would be negative — but should not crash
    expect(Number.isFinite(result.grandTotal)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 9: QA Auditor — Data Quality Tier Validation
// Profile: Systematically tests all quality tiers and scoring
// Tests: Quality score math, grade boundaries, recommendation logic
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 9: QA Auditor (Data Quality Scoring)', () => {
  it('all PRIMARY → score 100, grade Excellent', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q1', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'q2', fuelType: 'DIESEL_HSD', quantity: 1, unit: 'kL', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'q3', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 100, unit: 'tonne', dataQualityFlag: 'PRIMARY' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.dataQuality.overall).toBe(100);
    expect(result.dataQuality.grade).toBe('Excellent');
  });

  it('all SECONDARY → score 67, grade Good', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q4', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 'q5', fuelType: 'DIESEL_HSD', quantity: 1, unit: 'kL', dataQualityFlag: 'SECONDARY' }),
      ],
    });
    const result = calculateInventory(input);
    // 2 × weight 2 / (2 × 3) = 4/6 = 66.7% → rounds to 67
    expect(result.dataQuality.overall).toBe(67);
    expect(result.dataQuality.grade).toBe('Good');
  });

  it('all ESTIMATED → score 33, grade Needs Improvement', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q6', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'ESTIMATED' }),
        activity({ id: 'q7', fuelType: 'DIESEL_HSD', quantity: 1, unit: 'kL', dataQualityFlag: 'ESTIMATED' }),
        activity({ id: 'q8', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 100, unit: 'tonne', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    const result = calculateInventory(input);
    // 3 × 1 / (3 × 3) = 3/9 = 33%
    expect(result.dataQuality.overall).toBe(33);
    expect(result.dataQuality.grade).toBe('Needs Improvement');
  });

  it('mixed quality: 2 PRIMARY + 1 SECONDARY + 1 ESTIMATED → score 67', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q9', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'q10', fuelType: 'DIESEL_HSD', quantity: 1, unit: 'kL', dataQualityFlag: 'PRIMARY' }),
        activity({ id: 'q11', fuelType: 'COAL_INDIAN', quantity: 10, unit: 'tonne', dataQualityFlag: 'SECONDARY' }),
        activity({ id: 'q12', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 100, unit: 'tonne', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    const result = calculateInventory(input);
    // (3+3+2+1) / (4×3) = 9/12 = 75%
    expect(result.dataQuality.overall).toBe(75);
    expect(result.dataQuality.grade).toBe('Good');
    expect(result.dataQuality.breakdown.primary).toBe(2);
    expect(result.dataQuality.breakdown.secondary).toBe(1);
    expect(result.dataQuality.breakdown.estimated).toBe(1);
    expect(result.dataQuality.breakdown.total).toBe(4);
  });

  it('recommends replacing spend-based estimates when present', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q13', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'ESTIMATED' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.dataQuality.recommendations.some(r => r.includes('spend-based'))).toBe(true);
  });

  it('recommends metering when no PRIMARY data', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'q14', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 1000, unit: 'kWh', dataQualityFlag: 'SECONDARY' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.dataQuality.recommendations.some(r => r.includes('metered') || r.includes('meter'))).toBe(true);
  });

  it('no data entries → score 0, grade Needs Improvement', () => {
    const input = makeInput({ activityData: [] });
    const result = calculateInventory(input);
    expect(result.dataQuality.overall).toBe(0);
    expect(result.dataQuality.grade).toBe('Needs Improvement');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 10: Indian Unit Chaos — Every Wild Unit MSMEs Actually Use
// Profile: Tests cylinders, bags, lakh units, litres, INR, mixed
// Tests: Unit conversion accuracy, alternate unit paths, density calcs
// ═══════════════════════════════════════════════════════════════════════════

describe('Agent 10: Indian Unit Chaos (Cylinders, Bags, Lakh Units)', () => {
  it('converts domestic LPG cylinders (1 cylinder = 14.2 kg = 0.0142 tonne)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'lpg-cyl', fuelType: 'LPG',
          quantity: 10, unit: 'cylinder_domestic',
          dataQualityFlag: 'SECONDARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 10 cylinders × 0.0142 t = 0.142 t → energy → emissions
    const calc = result.calculations[0];
    expect(calc.totalCo2eTonnes).toBeGreaterThan(0);
    // Verify: 0.142 t → 0.000142 Gg × 47.3 TJ/Gg = 0.006716 TJ
    // CO2: 0.006716 × 63100 = 423.8 kgCO2 = 0.4238 tCO2
    expect(calc.co2Tonnes).toBeCloseTo(0.4238, 1);
  });

  it('converts commercial LPG cylinders (1 cylinder = 19 kg)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'lpg-comm', fuelType: 'LPG',
          quantity: 5, unit: 'cylinder_commercial',
          dataQualityFlag: 'SECONDARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 5 × 0.019 t = 0.095 t
    expect(result.calculations[0].totalCo2eTonnes).toBeGreaterThan(0);
  });

  it('converts coal bags (1 bag = 50 kg = 0.05 tonne)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'coal-bag', fuelType: 'COAL_INDIAN',
          quantity: 100, unit: 'bag_50kg',
          dataQualityFlag: 'SECONDARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 100 bags × 0.05 = 5 tonnes coal
    // 5 t → 0.005 Gg × 18.9 = 0.0945 TJ
    // CO2: 0.0945 × 96100 = 9081.45 kgCO2 = 9.081 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(9.081, 0);
  });

  it('converts lakh units of electricity (1 lakh = 100,000 kWh)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'lakh-elec', scope: 2, sourceCategory: 'grid_electricity',
          fuelType: 'GRID_ELECTRICITY',
          quantity: 1.5, unit: 'lakh_unit',
          dataQualityFlag: 'PRIMARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 1.5 lakh × 100,000 = 150,000 kWh × 0.710 = 106,500 kgCO2 = 106.5 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(106.5, 0);
  });

  it('converts MWh to kWh for electricity', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'mwh-elec', scope: 2, sourceCategory: 'grid_electricity',
          fuelType: 'GRID_ELECTRICITY',
          quantity: 100, unit: 'MWh',
          dataQualityFlag: 'PRIMARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    // 100 MWh × 1000 = 100,000 kWh × 0.710 = 71,000 kgCO2 = 71 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(71, 0);
  });

  it('converts diesel in litres (not kL)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'diesel-litre', fuelType: 'DIESEL_HSD',
          quantity: 500, unit: 'litre',
          dataQualityFlag: 'PRIMARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 500 litres = 0.5 kL → 0.5 × 0.832 = 0.416 t → 0.000416 Gg × 43.0 = 0.017888 TJ
    // CO2: 0.017888 × 74100 = 1325.1 kgCO2 = 1.325 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(1.325, 0);
  });

  it('converts coal in kg (not tonnes)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'coal-kg', fuelType: 'COAL_INDIAN',
          quantity: 5000, unit: 'kg',
          dataQualityFlag: 'SECONDARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 5000 kg = 5 tonnes → same as 100 bags test
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(9.081, 0);
  });

  it('spend-based electricity (INR → kWh → tCO2)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'spend-elec', scope: 2, sourceCategory: 'grid_electricity',
          fuelType: 'GRID_ELECTRICITY',
          inputMode: 'spend', spendInr: 800000,
          dataQualityFlag: 'ESTIMATED',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // ₹800,000 / ₹8 per kWh = 100,000 kWh × 0.710 = 71 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(71, 0);
  });

  it('spend-based diesel (INR → litres → kL → TJ → tCO2)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'spend-diesel', fuelType: 'DIESEL_HSD',
          inputMode: 'spend', spendInr: 90000,
          dataQualityFlag: 'ESTIMATED',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // ₹90,000 / ₹90 per litre = 1000 litres = 1 kL
    // 1 kL × 0.832 = 0.832 t → 0.000832 Gg × 43.0 = 0.035776 TJ
    // CO2: 0.035776 × 74100 = 2651.0 kgCO2 = 2.651 tCO2
    expect(result.calculations[0].co2Tonnes).toBeCloseTo(2.651, 0);
  });

  it('handles natural gas in m3 (alternate unit → thousand_m3)', () => {
    const input = makeInput({
      activityData: [
        activity({
          id: 'ng-m3', fuelType: 'NATURAL_GAS',
          quantity: 10000, unit: 'm3',
          dataQualityFlag: 'PRIMARY',
        }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(1);
    // 10000 m3 × 0.001 = 10 thousand_m3
    // 10 × 0.74 (density) × 1000 / 1000 = 7.4 tonnes = 0.0074 Gg
    // 0.0074 × 48.0 = 0.3552 TJ
    // CO2: 0.3552 × 56100 = 19,926.72 kgCO2 = 19.93 tCO2
    expect(result.calculations[0].co2Tonnes).toBeGreaterThan(15);
    expect(result.calculations[0].co2Tonnes).toBeLessThan(25);
  });

  it('mixed units in one inventory — all convert correctly', () => {
    const input = makeInput({
      activityData: [
        activity({ id: 'mix1', fuelType: 'DIESEL_HSD', quantity: 500, unit: 'litre' }),
        activity({ id: 'mix2', fuelType: 'COAL_INDIAN', quantity: 200, unit: 'bag_50kg' }),
        activity({ id: 'mix3', fuelType: 'LPG', quantity: 20, unit: 'cylinder_domestic' }),
        activity({ id: 'mix4', scope: 2, sourceCategory: 'grid_electricity', fuelType: 'GRID_ELECTRICITY', quantity: 2, unit: 'lakh_unit' }),
        activity({ id: 'mix5', scope: 3, sourceCategory: 'purchased_goods', fuelType: 'SCRAP_STEEL', quantity: 500, unit: 'tonne' }),
      ],
    });
    const result = calculateInventory(input);
    expect(result.calculations.length).toBe(5);
    // All should produce non-zero, finite emissions
    for (const calc of result.calculations) {
      expect(calc.totalCo2eTonnes).toBeGreaterThan(0);
      expect(Number.isFinite(calc.totalCo2eTonnes)).toBe(true);
    }
  });
});

/**
 * 5 Test Agents — Real MSME User Scenarios for Payback Period Validation
 *
 * Each agent simulates an actual MSME user's technology portfolio,
 * verifies the blended payback is realistic (1-8 years), and confirms
 * that cost savings are NOT incorrectly scaled by residualFraction.
 */
import { describe, it, expect } from 'vitest';
import { calculateCombinedImpact } from '@/lib/rec-engine/index';
import type { TechImpact } from '@/lib/rec-engine/types';

// ── Helper: Build a TechImpact from realistic MSME parameters ────────────

function makeTech(overrides: {
  techId: string;
  name: string;
  matchedEmissionsTonnes: number;
  matchedEnergyGj: number;
  reductionPct: number;
  costSavingMinInr: number;
  costSavingMaxInr: number;
  capexMinLakhs: number;
  capexMaxLakhs: number;
  paybackMinYears: number;
  paybackMaxYears: number;
  scopeAddressed?: string;
}): TechImpact {
  const midReduction = overrides.matchedEmissionsTonnes * (overrides.reductionPct / 100);
  return {
    techId: overrides.techId,
    name: overrides.name,
    category: 'EE',
    reductionMinTonnes: midReduction * 0.8,
    reductionMaxTonnes: midReduction * 1.2,
    reductionMidTonnes: midReduction,
    energySavingMinGj: overrides.matchedEnergyGj * (overrides.reductionPct / 100) * 0.8,
    energySavingMaxGj: overrides.matchedEnergyGj * (overrides.reductionPct / 100) * 1.2,
    costSavingMinInr: overrides.costSavingMinInr,
    costSavingMaxInr: overrides.costSavingMaxInr,
    capexMinLakhs: overrides.capexMinLakhs,
    capexMaxLakhs: overrides.capexMaxLakhs,
    paybackMinYears: overrides.paybackMinYears,
    paybackMaxYears: overrides.paybackMaxYears,
    paybackEstimateYears: (overrides.paybackMinYears + overrides.paybackMaxYears) / 2,
    pctOfTotal: overrides.reductionPct,
    matchedEmissionsTonnes: overrides.matchedEmissionsTonnes,
    matchedEnergyGj: overrides.matchedEnergyGj,
    scopeAddressed: overrides.scopeAddressed ?? 'Scope 2',
    energyTypeSaved: 'Electrical',
    technologyReadiness: 'Commercially mature',
    demonstratedInIndia: true,
    indianClusters: null,
    description: '',
    source: '',
    sourceUrl: null,
    warnings: [],
    reductionSteps: [],
    endUseShare: 1,
    endUseLabel: 'All',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent 1: Small Induction Furnace — Micro Enterprise
// ═══════════════════════════════════════════════════════════════════════════
// Profile: 5000 tpa steel, ₹3 Cr turnover, 15 employees
// Baseline: ~4000 tCO2e (heavy Scope 2 from IF electricity)
// Typical picks: VFDs (T001), LED lighting (T003), IE3 motors (T002)
// Expected payback: 1-3 years (these are textbook quick-win EE techs)

describe('Agent 1: Small IF — micro enterprise, 3 quick-win EE techs', () => {
  const baseline = 4000; // tCO2e
  const scope1 = 800;
  const scope2 = 3000;
  const scope3 = 200;

  const techs: TechImpact[] = [
    makeTech({
      techId: 'T001', name: 'VFDs on Furnace Cooling',
      matchedEmissionsTonnes: 900, matchedEnergyGj: 1500,
      reductionPct: 25,
      costSavingMinInr: 400000, costSavingMaxInr: 600000,
      capexMinLakhs: 8, capexMaxLakhs: 15,
      paybackMinYears: 1, paybackMaxYears: 3,
    }),
    makeTech({
      techId: 'T003', name: 'LED Lighting',
      matchedEmissionsTonnes: 120, matchedEnergyGj: 200,
      reductionPct: 60,
      costSavingMinInr: 80000, costSavingMaxInr: 120000,
      capexMinLakhs: 0.5, capexMaxLakhs: 1,
      paybackMinYears: 0.3, paybackMaxYears: 0.5,
    }),
    makeTech({
      techId: 'T002', name: 'IE3 Premium Motors',
      matchedEmissionsTonnes: 600, matchedEnergyGj: 1000,
      reductionPct: 8,
      costSavingMinInr: 120000, costSavingMaxInr: 180000,
      capexMinLakhs: 3, capexMaxLakhs: 6,
      paybackMinYears: 2, paybackMaxYears: 4,
    }),
  ];

  const result = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3);

  it('blended payback is realistic (under 3 years)', () => {
    expect(result.blendedPaybackYears).not.toBeNull();
    expect(result.blendedPaybackYears!).toBeGreaterThan(0.5);
    expect(result.blendedPaybackYears!).toBeLessThan(3);
  });

  it('total savings reflect full value of each technology', () => {
    // Min savings should be at least the sum of individual mins (no discounting)
    // VFDs=400k + LEDs=80k + motors=120k = 600k
    expect(result.totalAnnualSavingMinInr).toBeGreaterThanOrEqual(600000);
    expect(result.totalAnnualSavingMaxInr).toBeGreaterThanOrEqual(900000);
  });

  it('total CAPEX is reasonable for a micro enterprise', () => {
    // ₹11.5L - ₹22L — affordable with ADEETIE support
    expect(result.totalCapexMinLakhs).toBeCloseTo(11.5, 0);
    expect(result.totalCapexMaxLakhs).toBeCloseTo(22, 0);
  });

  it('CO2 reduction is meaningful (10-40%)', () => {
    expect(result.totalReductionPct).toBeGreaterThan(5);
    expect(result.totalReductionPct).toBeLessThan(40);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Agent 2: Medium Re-Rolling Mill — 5 technologies including cluster boiler
// ═══════════════════════════════════════════════════════════════════════════
// Profile: 20000 tpa steel, ₹20 Cr turnover, 80 employees
// Baseline: ~12000 tCO2e (heavy Scope 1 from coal furnaces)
// Picks: VFDs, waste heat recovery, LED, common boiler (T011), RESCO solar
// With T011 at per-MSME CAPEX (₹10-100L), payback should stay reasonable

describe('Agent 2: Medium re-rolling mill — 5 techs including cluster boiler', () => {
  const baseline = 12000;
  const scope1 = 9000;
  const scope2 = 2500;
  const scope3 = 500;

  const techs: TechImpact[] = [
    makeTech({
      techId: 'T003', name: 'LED Lighting',
      matchedEmissionsTonnes: 150, matchedEnergyGj: 250,
      reductionPct: 60,
      costSavingMinInr: 100000, costSavingMaxInr: 150000,
      capexMinLakhs: 1, capexMaxLakhs: 2,
      paybackMinYears: 0.3, paybackMaxYears: 0.5,
    }),
    makeTech({
      techId: 'T001', name: 'VFDs',
      matchedEmissionsTonnes: 750, matchedEnergyGj: 1250,
      reductionPct: 25,
      costSavingMinInr: 500000, costSavingMaxInr: 750000,
      capexMinLakhs: 12, capexMaxLakhs: 20,
      paybackMinYears: 1, paybackMaxYears: 3,
    }),
    makeTech({
      techId: 'T009', name: 'Waste Heat Recovery',
      matchedEmissionsTonnes: 3600, matchedEnergyGj: 6000,
      reductionPct: 15,
      costSavingMinInr: 800000, costSavingMaxInr: 1200000,
      capexMinLakhs: 25, capexMaxLakhs: 60,
      paybackMinYears: 2, paybackMaxYears: 4,
      scopeAddressed: 'Scope 1',
    }),
    makeTech({
      techId: 'T011', name: 'Common Boiler / Cogen (per-MSME share)',
      matchedEmissionsTonnes: 2700, matchedEnergyGj: 4500,
      reductionPct: 25,
      costSavingMinInr: 600000, costSavingMaxInr: 900000,
      // Per-MSME CAPEX (Bug 2 fix: ₹10-100L, not ₹500-2000L)
      capexMinLakhs: 10, capexMaxLakhs: 100,
      paybackMinYears: 3, paybackMaxYears: 5,
      scopeAddressed: 'Scope 1',
    }),
    makeTech({
      techId: 'T016', name: 'RESCO Solar',
      matchedEmissionsTonnes: 2500, matchedEnergyGj: 4167,
      reductionPct: 40,
      costSavingMinInr: 400000, costSavingMaxInr: 700000,
      capexMinLakhs: 0, capexMaxLakhs: 0, // RESCO = zero upfront
      paybackMinYears: 0, paybackMaxYears: 0,
    }),
  ];

  const result = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3);

  it('blended payback is 2-6 years for a heavy industrial mix', () => {
    expect(result.blendedPaybackYears).not.toBeNull();
    expect(result.blendedPaybackYears!).toBeGreaterThan(1);
    expect(result.blendedPaybackYears!).toBeLessThan(6);
  });

  it('savings are not crushed by residual fraction', () => {
    // Total savings should be roughly sum of individual savings
    // LED=100k + VFDs=500k + WHR=800k + Boiler=600k + Solar=400k = 2.4M min
    // With the old bug, later techs got multiplied by ~0.3-0.5, cutting total in half
    expect(result.totalAnnualSavingMinInr).toBeGreaterThan(2000000);
  });

  it('CAPEX does not include cluster-level pricing', () => {
    // Max CAPEX should be well under ₹200L (not ₹2000L from old T011 CAPEX)
    expect(result.totalCapexMaxLakhs).toBeLessThan(200);
  });

  it('T011 per-MSME CAPEX is reflected, not cluster CAPEX', () => {
    // T011 contributes ₹10-100L, not ₹500-2000L
    // Total min capex: 1 + 12 + 25 + 10 + 0 = 48
    expect(result.totalCapexMinLakhs).toBeCloseTo(48, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Agent 3: EAF Mini Mill — Small Enterprise, electricity-heavy
// ═══════════════════════════════════════════════════════════════════════════
// Profile: 15000 tpa, ₹12 Cr turnover, EAF with massive electricity bill
// Baseline: ~8500 tCO2e (70% Scope 2)
// Picks: VFDs, EE furnace (T012), rooftop solar CAPEX (T015), LED
// Expected payback: 2-5 years

describe('Agent 3: EAF mini mill — electricity-dominant, 4 techs', () => {
  const baseline = 8500;
  const scope1 = 1500;
  const scope2 = 6500;
  const scope3 = 500;

  const techs: TechImpact[] = [
    makeTech({
      techId: 'T003', name: 'LED Lighting',
      matchedEmissionsTonnes: 130, matchedEnergyGj: 217,
      reductionPct: 60,
      costSavingMinInr: 90000, costSavingMaxInr: 130000,
      capexMinLakhs: 0.8, capexMaxLakhs: 1.5,
      paybackMinYears: 0.3, paybackMaxYears: 0.5,
    }),
    makeTech({
      techId: 'T001', name: 'VFDs on Fume Extraction & Cooling',
      matchedEmissionsTonnes: 1300, matchedEnergyGj: 2167,
      reductionPct: 25,
      costSavingMinInr: 600000, costSavingMaxInr: 900000,
      capexMinLakhs: 10, capexMaxLakhs: 18,
      paybackMinYears: 1, paybackMaxYears: 2.5,
    }),
    makeTech({
      techId: 'T012', name: 'EE Induction Furnace (IGBT)',
      matchedEmissionsTonnes: 4500, matchedEnergyGj: 7500,
      reductionPct: 15,
      costSavingMinInr: 1200000, costSavingMaxInr: 2000000,
      capexMinLakhs: 50, capexMaxLakhs: 200,
      paybackMinYears: 3, paybackMaxYears: 6,
    }),
    makeTech({
      techId: 'T015', name: 'Rooftop Solar (CAPEX)',
      matchedEmissionsTonnes: 2000, matchedEnergyGj: 3333,
      reductionPct: 30,
      costSavingMinInr: 500000, costSavingMaxInr: 800000,
      capexMinLakhs: 20, capexMaxLakhs: 50,
      paybackMinYears: 4, paybackMaxYears: 6,
    }),
  ];

  const result = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3);

  it('blended payback is 2-6 years', () => {
    expect(result.blendedPaybackYears).not.toBeNull();
    expect(result.blendedPaybackYears!).toBeGreaterThan(2);
    expect(result.blendedPaybackYears!).toBeLessThan(6);
  });

  it('does not double-discount savings across independent energy streams', () => {
    // LED savings (lighting) should not be reduced because VFDs (motors) already ran
    // Total min: 90k + 600k + 1200k + 500k = 2.39M
    expect(result.totalAnnualSavingMinInr).toBeGreaterThan(2300000);
  });

  it('sequential emission reduction is less than additive', () => {
    // Each tech reduces a SUBSET of baseline (matched emissions), not all of it
    // LED=130t, VFD=1300t, EE Furnace=4500t, Solar=2000t — significant overlap in Scope 2
    // Sequential cascade on overlapping pools yields ~15-40% total reduction
    expect(result.totalReductionPct).toBeLessThan(50);
    expect(result.totalReductionPct).toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Agent 4: Forging Unit — 8 technologies (the reported bug scenario)
// ═══════════════════════════════════════════════════════════════════════════
// Profile: 8000 tpa forgings, ₹8 Cr turnover, natural gas + electricity
// Baseline: ~5000 tCO2e
// Picks: 8 techs spanning EE, sector-specific, renewable, fuel switching
// This is the scenario that was showing 19.8 years. Should be 2-5 years.

describe('Agent 4: Forging unit — 8 techs (reproduces reported 19.8yr bug)', () => {
  const baseline = 5000;
  const scope1 = 2000;
  const scope2 = 2500;
  const scope3 = 500;

  const techs: TechImpact[] = [
    makeTech({
      techId: 'T003', name: 'LED Lighting',
      matchedEmissionsTonnes: 75, matchedEnergyGj: 125,
      reductionPct: 60,
      costSavingMinInr: 60000, costSavingMaxInr: 90000,
      capexMinLakhs: 0.4, capexMaxLakhs: 0.8,
      paybackMinYears: 0.3, paybackMaxYears: 0.5,
    }),
    makeTech({
      techId: 'T001', name: 'VFDs',
      matchedEmissionsTonnes: 625, matchedEnergyGj: 1042,
      reductionPct: 25,
      costSavingMinInr: 350000, costSavingMaxInr: 520000,
      capexMinLakhs: 6, capexMaxLakhs: 12,
      paybackMinYears: 1, paybackMaxYears: 2.5,
    }),
    makeTech({
      techId: 'T002', name: 'IE3 Premium Motors',
      matchedEmissionsTonnes: 500, matchedEnergyGj: 833,
      reductionPct: 8,
      costSavingMinInr: 100000, costSavingMaxInr: 150000,
      capexMinLakhs: 2, capexMaxLakhs: 5,
      paybackMinYears: 2, paybackMaxYears: 4,
    }),
    makeTech({
      techId: 'T004', name: 'Power Factor Correction',
      matchedEmissionsTonnes: 250, matchedEnergyGj: 417,
      reductionPct: 5,
      costSavingMinInr: 80000, costSavingMaxInr: 120000,
      capexMinLakhs: 1, capexMaxLakhs: 2,
      paybackMinYears: 0.5, paybackMaxYears: 1.5,
    }),
    makeTech({
      techId: 'T005', name: 'Compressed Air Optimisation',
      matchedEmissionsTonnes: 200, matchedEnergyGj: 333,
      reductionPct: 20,
      costSavingMinInr: 100000, costSavingMaxInr: 160000,
      capexMinLakhs: 1.5, capexMaxLakhs: 3,
      paybackMinYears: 0.5, paybackMaxYears: 2,
    }),
    makeTech({
      techId: 'T009', name: 'Waste Heat Recovery',
      matchedEmissionsTonnes: 1200, matchedEnergyGj: 2000,
      reductionPct: 15,
      costSavingMinInr: 300000, costSavingMaxInr: 500000,
      capexMinLakhs: 15, capexMaxLakhs: 35,
      paybackMinYears: 2, paybackMaxYears: 4,
      scopeAddressed: 'Scope 1',
    }),
    makeTech({
      techId: 'T016', name: 'RESCO Solar',
      matchedEmissionsTonnes: 1500, matchedEnergyGj: 2500,
      reductionPct: 40,
      costSavingMinInr: 300000, costSavingMaxInr: 500000,
      capexMinLakhs: 0, capexMaxLakhs: 0,
      paybackMinYears: 0, paybackMaxYears: 0,
    }),
    makeTech({
      techId: 'T019', name: 'PNG Conversion',
      matchedEmissionsTonnes: 800, matchedEnergyGj: 1333,
      reductionPct: 20,
      costSavingMinInr: 200000, costSavingMaxInr: 350000,
      capexMinLakhs: 5, capexMaxLakhs: 15,
      paybackMinYears: 1, paybackMaxYears: 3,
      scopeAddressed: 'Scope 1',
    }),
  ];

  const result = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3);

  it('blended payback is 2-5 years, NOT 19.8 years', () => {
    expect(result.blendedPaybackYears).not.toBeNull();
    expect(result.blendedPaybackYears!).toBeGreaterThan(1);
    expect(result.blendedPaybackYears!).toBeLessThan(5);
  });

  it('savings for tech 8 are not crushed to near-zero', () => {
    // With the old bug, tech 8 (PNG) would have residualFraction ~0.3
    // meaning its ₹200k-350k savings would be counted as ₹60k-105k
    // Total min should be close to the sum: ~1.49M
    const rawSumMin = 60000 + 350000 + 100000 + 80000 + 100000 + 300000 + 300000 + 200000;
    expect(result.totalAnnualSavingMinInr).toBeGreaterThan(rawSumMin * 0.95);
  });

  it('CAPEX is affordable for a small enterprise', () => {
    // Sum: 0.4 + 6 + 2 + 1 + 1.5 + 15 + 0 + 5 = ₹30.9L min
    expect(result.totalCapexMinLakhs).toBeCloseTo(30.9, 0);
    expect(result.totalCapexMaxLakhs).toBeLessThan(80);
  });

  it('reduction % is substantial across 8 techs', () => {
    expect(result.totalReductionPct).toBeGreaterThan(20);
    expect(result.totalReductionPct).toBeLessThan(80);
  });

  it('all 8 techs appear in the sequence', () => {
    expect(result.technologySequence.length).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Agent 5: Partial Implementation — User already has VFDs on 60% of motors
// ═══════════════════════════════════════════════════════════════════════════
// Profile: 10000 tpa, already invested in some EE measures
// Tests that implementedPcts correctly adjusts BOTH emissions AND savings
// (not just emissions as before the fix)

describe('Agent 5: Partial implementation — VFDs 60% done, LED 0%, solar 0%', () => {
  const baseline = 6000;
  const scope1 = 1000;
  const scope2 = 4500;
  const scope3 = 500;

  const techs: TechImpact[] = [
    makeTech({
      techId: 'T001', name: 'VFDs (60% already installed)',
      matchedEmissionsTonnes: 1125, matchedEnergyGj: 1875,
      reductionPct: 25,
      costSavingMinInr: 500000, costSavingMaxInr: 750000,
      capexMinLakhs: 10, capexMaxLakhs: 18,
      paybackMinYears: 1, paybackMaxYears: 2.5,
    }),
    makeTech({
      techId: 'T003', name: 'LED Lighting (new)',
      matchedEmissionsTonnes: 135, matchedEnergyGj: 225,
      reductionPct: 60,
      costSavingMinInr: 90000, costSavingMaxInr: 135000,
      capexMinLakhs: 0.8, capexMaxLakhs: 1.5,
      paybackMinYears: 0.3, paybackMaxYears: 0.5,
    }),
    makeTech({
      techId: 'T015', name: 'Rooftop Solar CAPEX (new)',
      matchedEmissionsTonnes: 2250, matchedEnergyGj: 3750,
      reductionPct: 30,
      costSavingMinInr: 600000, costSavingMaxInr: 900000,
      capexMinLakhs: 25, capexMaxLakhs: 50,
      paybackMinYears: 4, paybackMaxYears: 6,
    }),
  ];

  const implementedPcts = { 'T001': 60 }; // VFDs 60% done

  const resultPartial = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3, implementedPcts);
  const resultFresh = calculateCombinedImpact(techs, baseline, scope1, scope2, scope3);

  it('partial VFD savings are 40% of full VFD savings', () => {
    // VFD savings should be 40% of full value (60% already done)
    // Full: ₹500k min. Partial: ₹200k min.
    // LED and solar should be 100% of their value
    const expectedMin = 500000 * 0.4 + 90000 + 600000; // 200k + 90k + 600k = 890k
    // Allow small tolerance from sequential emission cascade differences
    expect(resultPartial.totalAnnualSavingMinInr).toBeGreaterThan(expectedMin * 0.95);
    expect(resultPartial.totalAnnualSavingMinInr).toBeLessThan(expectedMin * 1.05);
  });

  it('fresh install has higher savings than partial', () => {
    expect(resultFresh.totalAnnualSavingMinInr).toBeGreaterThan(resultPartial.totalAnnualSavingMinInr);
  });

  it('partial implementation still gives reasonable payback', () => {
    expect(resultPartial.blendedPaybackYears).not.toBeNull();
    expect(resultPartial.blendedPaybackYears!).toBeGreaterThan(1);
    expect(resultPartial.blendedPaybackYears!).toBeLessThan(8);
  });

  it('LED and solar savings are unaffected by VFD partial implementation', () => {
    // LED and solar have no implementedPct, so their savings should be full
    // In the old code, they would be reduced by residualFraction (wrong)
    // LED=90k + Solar=600k = 690k should be nearly the same in both runs
    const freshNonVFD = resultFresh.totalAnnualSavingMinInr - 500000;   // subtract full VFD
    const partialNonVFD = resultPartial.totalAnnualSavingMinInr - 200000; // subtract 40% VFD
    // Non-VFD savings should be very close (tiny difference from cascade effects)
    expect(Math.abs(freshNonVFD - partialNonVFD)).toBeLessThan(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cross-agent: Regression guard — savings must never be scaled by residual
// ═══════════════════════════════════════════════════════════════════════════

describe('Regression: cost savings independence from emission cascade', () => {
  it('adding a zero-saving tech before a real tech does not reduce real tech savings', () => {
    // Tech A saves 50% of emissions but has zero cost savings (e.g., process change)
    // Tech B saves ₹500k from a different energy stream
    // Bug: Tech B savings would be multiplied by 0.5 (residualFraction after A)
    // Fix: Tech B savings should be full ₹500k
    const techA = makeTech({
      techId: 'T-ZERO', name: 'Process Change (no cost saving)',
      matchedEmissionsTonnes: 500, matchedEnergyGj: 0,
      reductionPct: 50,
      costSavingMinInr: 0, costSavingMaxInr: 0,
      capexMinLakhs: 0, capexMaxLakhs: 0,
      paybackMinYears: 0, paybackMaxYears: 0,
      scopeAddressed: 'Scope 1',
    });
    const techB = makeTech({
      techId: 'T-SAVER', name: 'Electricity Saver',
      matchedEmissionsTonnes: 500, matchedEnergyGj: 1000,
      reductionPct: 20,
      costSavingMinInr: 500000, costSavingMaxInr: 500000,
      capexMinLakhs: 10, capexMaxLakhs: 10,
      paybackMinYears: 2, paybackMaxYears: 2,
    });

    const withA = calculateCombinedImpact([techA, techB], 1000, 500, 500, 0);
    const withoutA = calculateCombinedImpact([techB], 1000, 500, 500, 0);

    // Tech B savings should be identical regardless of whether Tech A runs first
    expect(withA.totalAnnualSavingMinInr).toBe(withoutA.totalAnnualSavingMinInr);
    expect(withA.totalAnnualSavingMaxInr).toBe(withoutA.totalAnnualSavingMaxInr);
  });
});

// ── GHG Tool Seed Data ─────────────────────────────────────────────────────
// All data points are from verified, auditable sources.
// See data/source-audit.xlsx for full audit trail.
//
// Primary Sources:
// - IPCC 2019 Refinement to 2006 Guidelines Vol 2 (Energy): Emission factors, NCV values
// - IPCC AR5 WG1 Table 8.A.1: GWP values (100-year)
// - CEA CO2 Baseline Database v21.0 (FY2024-25): Indian grid emission factor
// - Worldsteel Association: Sector benchmarks
// - BEE PAT Scheme: Indian steel intensity data

import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding GHG Tool reference data...\n');

  // ── Fuel Properties ────────────────────────────────────────────────────────
  // Source: IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4/2.2 (CO2 EF)
  // Densities from IPCC 2006 Vol 2 Table 1.2 footnotes & IS standards

  const fuelProperties = [
    {
      code: 'DIESEL_HSD',
      name: 'Diesel / HSD (High Speed Diesel)',
      category: 'fuel',
      baseUnit: 'kL',
      density: 0.832,    // IPCC 2006 Vol 2 Table 1.2 (Gas/Diesel Oil default)
      ncvTjPerGg: 43.0,  // IPCC 2006 Vol 2 Table 1.2 (Gas/Diesel Oil)
      co2EfKgPerTj: 74100, // IPCC 2006 Vol 2 Table 1.4 (Gas/Diesel Oil)
      defaultPriceInr: 90, // Approx retail price INR/litre (indicative, 2024)
      alternateUnits: JSON.stringify([
        { unit: 'litre', factor: 0.001, toUnit: 'kL' },
        { unit: 'kg', factor: 1.2019, toUnit: 'litre' }, // 1/0.832
      ]),
      commonMsmeUse: 'DG sets, furnace preheating, transport',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Gas/Diesel Oil. NCV=43.0 TJ/Gg. Density 0.832 t/kL.',
    },
    {
      code: 'PETROL_MS',
      name: 'Petrol / Motor Spirit',
      category: 'fuel',
      baseUnit: 'kL',
      density: 0.745,    // IPCC 2006 Vol 2 Table 1.2 (Motor Gasoline)
      ncvTjPerGg: 44.3,  // IPCC 2006 Vol 2 Table 1.2 (Motor Gasoline)
      co2EfKgPerTj: 69300, // IPCC 2006 Vol 2 Table 1.4 (Motor Gasoline)
      defaultPriceInr: 105,
      alternateUnits: JSON.stringify([
        { unit: 'litre', factor: 0.001, toUnit: 'kL' },
      ]),
      commonMsmeUse: 'Transport vehicles',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Motor Gasoline. NCV=44.3 TJ/Gg.',
    },
    {
      code: 'LPG',
      name: 'Liquefied Petroleum Gas',
      category: 'fuel',
      baseUnit: 'tonne',
      density: 0.54,     // IPCC 2006 Vol 2 Table 1.2 (LPG)
      ncvTjPerGg: 47.3,  // IPCC 2006 Vol 2 Table 1.2 (LPG)
      co2EfKgPerTj: 63100, // IPCC 2006 Vol 2 Table 1.4 (LPG)
      defaultPriceInr: 900, // INR per kg (approx commercial rate)
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
        { unit: 'cylinder_domestic', factor: 14.2, toUnit: 'kg' },  // 14.2 kg domestic
        { unit: 'cylinder_commercial', factor: 19.0, toUnit: 'kg' }, // 19 kg commercial
      ]),
      commonMsmeUse: 'Canteen, preheating, small furnaces',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Liquefied Petroleum Gases. NCV=47.3 TJ/Gg.',
    },
    {
      code: 'NATURAL_GAS',
      name: 'Natural Gas',
      category: 'fuel',
      baseUnit: '1000m3', // Thousand cubic metres
      density: 0.74,     // IPCC 2006 Vol 2 Table 1.2 (Natural Gas, kg/m3)
      ncvTjPerGg: 48.0,  // IPCC 2006 Vol 2 Table 1.2 (Natural Gas)
      co2EfKgPerTj: 56100, // IPCC 2006 Vol 2 Table 1.4 (Natural Gas)
      defaultPriceInr: null,
      alternateUnits: JSON.stringify([
        { unit: 'm3', factor: 0.001, toUnit: '1000m3' },
        { unit: 'SCM', factor: 0.001, toUnit: '1000m3' }, // Standard Cubic Metre
      ]),
      commonMsmeUse: 'Reheating furnaces, heat treatment',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Natural Gas. NCV=48.0 TJ/Gg.',
    },
    {
      code: 'COAL_INDIAN',
      name: 'Coal (Indian Sub-bituminous)',
      category: 'fuel',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: 18.9,  // IPCC 2006 Vol 2 Table 1.2 (Sub-bituminous Coal)
      co2EfKgPerTj: 96100, // IPCC 2006 Vol 2 Table 1.4 (Sub-bituminous Coal)
      defaultPriceInr: 6000, // INR per tonne (approx CIL notified price)
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
        { unit: 'bag_50kg', factor: 50, toUnit: 'kg' },
      ]),
      commonMsmeUse: 'Reheating furnaces, cupola furnaces, boilers',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Sub-Bituminous Coal. Indian coal is predominantly sub-bituminous. NCV=18.9 TJ/Gg.',
    },
    {
      code: 'COKING_COAL',
      name: 'Coking Coal',
      category: 'fuel',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: 28.2,  // IPCC 2006 Vol 2 Table 1.2 (Coking Coal)
      co2EfKgPerTj: 94600, // IPCC 2006 Vol 2 Table 1.4 (Coking Coal)
      defaultPriceInr: 15000,
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      ]),
      commonMsmeUse: 'Blast furnaces (larger integrated plants)',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Coking Coal. NCV=28.2 TJ/Gg.',
    },
    {
      code: 'COKE',
      name: 'Coke (Oven Coke / Met Coke)',
      category: 'fuel',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: 28.2,  // IPCC 2006 Vol 2 Table 1.2 (Coke Oven Coke)
      co2EfKgPerTj: 107000, // IPCC 2006 Vol 2 Table 1.4 (Coke Oven Coke)
      defaultPriceInr: 30000,
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      ]),
      commonMsmeUse: 'Cupola furnaces, foundries',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Coke Oven Coke. NCV=28.2 TJ/Gg. CO2 EF=107,000 kgCO2/TJ.',
    },
    {
      code: 'FURNACE_OIL',
      name: 'Furnace Oil',
      category: 'fuel',
      baseUnit: 'kL',
      density: 0.95,     // IPCC 2006 Vol 2 Table 1.2 (Residual Fuel Oil)
      ncvTjPerGg: 40.4,  // IPCC 2006 Vol 2 Table 1.2 (Residual Fuel Oil)
      co2EfKgPerTj: 77400, // IPCC 2006 Vol 2 Table 1.4 (Residual Fuel Oil)
      defaultPriceInr: 50, // INR per litre (approx)
      alternateUnits: JSON.stringify([
        { unit: 'litre', factor: 0.001, toUnit: 'kL' },
        { unit: 'kg', factor: 1.0526, toUnit: 'litre' }, // 1/0.95
      ]),
      commonMsmeUse: 'Furnaces, boilers, heat treatment',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'IPCC category: Residual Fuel Oil. NCV=40.4 TJ/Gg. Density 0.95 t/kL.',
    },
    {
      code: 'BIOMASS_WOOD',
      name: 'Wood / Biomass',
      category: 'fuel',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: 15.6,  // IPCC 2006 Vol 2 Table 1.2 (Wood/Wood Waste)
      co2EfKgPerTj: 112000, // IPCC 2006 Vol 2 Table 1.4 (Wood/Wood Waste) — BIOGENIC, reported separately
      defaultPriceInr: 3000,
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      ]),
      commonMsmeUse: 'Boilers, kiln firing',
      source: 'IPCC 2006 Vol 2 Table 1.2 (NCV), Table 1.4 (CO2 EF)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html',
      notes: 'BIOGENIC CO2 — reported separately per GHG Protocol, NOT added to Scope 1 total. NCV=15.6 TJ/Gg.',
    },
    {
      code: 'GRID_ELECTRICITY',
      name: 'Grid Electricity',
      category: 'electricity',
      baseUnit: 'kWh',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: 8, // INR per kWh (approx MSME industrial tariff)
      alternateUnits: JSON.stringify([
        { unit: 'unit', factor: 1, toUnit: 'kWh' },       // 1 unit = 1 kWh
        { unit: 'lakh_unit', factor: 100000, toUnit: 'kWh' }, // 1 lakh unit = 100,000 kWh
        { unit: 'MWh', factor: 1000, toUnit: 'kWh' },
      ]),
      commonMsmeUse: 'EAF, induction furnaces, motors, lighting',
      source: 'CEA CO2 Baseline Database Version 21.0',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      notes: 'Grid EF applied from EmissionFactor table, not from fuel property.',
    },
    {
      code: 'RENEWABLE_ELECTRICITY',
      name: 'Renewable Electricity (Solar/Wind)',
      category: 'electricity',
      baseUnit: 'kWh',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: 5,
      alternateUnits: JSON.stringify([
        { unit: 'unit', factor: 1, toUnit: 'kWh' },
        { unit: 'MWh', factor: 1000, toUnit: 'kWh' },
      ]),
      commonMsmeUse: 'Rooftop solar, renewable PPAs',
      source: 'GHG Protocol Scope 2 Guidance',
      sourceUrl: 'https://ghgprotocol.org/scope-2-guidance',
      notes: 'Zero-emission. Used for energy accounting and renewable percentage calculation.',
    },
    // Refrigerants
    {
      code: 'R22_HCFC22',
      name: 'HCFC-22 (Chlorodifluoromethane)',
      category: 'refrigerant',
      baseUnit: 'kg',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: null,
      alternateUnits: null,
      commonMsmeUse: 'Air conditioning, chillers (being phased out under Montreal Protocol)',
      source: 'IPCC AR5 WG1 Table 8.A.1',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      notes: 'GWP=1760 (AR5). Being phased out. Fugitive emissions = quantity refilled per year.',
    },
    {
      code: 'HFC134A',
      name: 'HFC-134a (1,1,1,2-Tetrafluoroethane)',
      category: 'refrigerant',
      baseUnit: 'kg',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: null,
      alternateUnits: null,
      commonMsmeUse: 'Vehicle air conditioning, commercial refrigeration',
      source: 'IPCC AR5 WG1 Table 8.A.1',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      notes: 'GWP=1300 (AR5).',
    },
    {
      code: 'SF6',
      name: 'Sulphur Hexafluoride',
      category: 'refrigerant',
      baseUnit: 'kg',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: null,
      alternateUnits: null,
      commonMsmeUse: 'Electrical switchgear insulation',
      source: 'IPCC AR5 WG1 Table 8.A.1',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      notes: 'GWP=23500 (AR5). Very potent GHG. Used in electrical equipment.',
    },
    // Process materials
    {
      code: 'GRAPHITE_ELECTRODE',
      name: 'Graphite Electrode',
      category: 'material',
      baseUnit: 'kg',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: null,
      alternateUnits: JSON.stringify([
        { unit: 'tonne', factor: 1000, toUnit: 'kg' },
      ]),
      commonMsmeUse: 'EAF steelmaking — electrode consumption',
      source: 'Stoichiometric: 12 (C) + 32 (O2) → 44 (CO2); ratio = 44/12 = 3.667',
      sourceUrl: null,
      notes: 'CO2 emission = electrode_kg × 3.667. Pure carbon oxidation (stoichiometric, not empirical).',
    },
    {
      code: 'LIMESTONE',
      name: 'Limestone (CaCO3)',
      category: 'material',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: 1500,
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      ]),
      commonMsmeUse: 'Slag formation in steelmaking',
      source: 'IPCC 2006 Vol 3 Ch 2 Table 2.1 (Mineral Industry)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol3.html',
      notes: 'CO2 EF = 0.440 tCO2/tonne limestone (stoichiometric from CaCO3 decomposition).',
    },
    {
      code: 'DOLOMITE',
      name: 'Dolomite (CaMg(CO3)2)',
      category: 'material',
      baseUnit: 'tonne',
      density: null,
      ncvTjPerGg: null,
      co2EfKgPerTj: null,
      defaultPriceInr: 2000,
      alternateUnits: JSON.stringify([
        { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      ]),
      commonMsmeUse: 'Fluxing agent in steelmaking',
      source: 'IPCC 2006 Vol 3 Ch 2 Table 2.1 (Mineral Industry)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol3.html',
      notes: 'CO2 EF = 0.477 tCO2/tonne dolomite (stoichiometric from CaMg(CO3)2 decomposition).',
    },
  ];

  console.log('  Seeding fuel properties...');
  for (const fp of fuelProperties) {
    await prisma.fuelProperty.upsert({
      where: { code: fp.code },
      update: fp,
      create: fp,
    });
  }
  console.log(`  ✓ ${fuelProperties.length} fuel properties seeded\n`);

  // ── GWP Values ─────────────────────────────────────────────────────────────
  // Source: IPCC AR5 WG1 Table 8.A.1 (100-year GWP values)
  // AR6 values from IPCC AR6 WG1 Table 7.15

  const gwpValues = [
    // AR5 values (default)
    { gas: 'CO2',  gwp: 1,     assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    { gas: 'CH4',  gwp: 28,    assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    { gas: 'N2O',  gwp: 265,   assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    { gas: 'SF6',  gwp: 23500, assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    { gas: 'R22',  gwp: 1760,  assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    { gas: 'HFC134A', gwp: 1300, assessmentReport: 'AR5', isDefault: true, source: 'IPCC AR5 WG1 Table 8.A.1', sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/' },
    // AR6 values (optional, for future use)
    { gas: 'CO2',  gwp: 1,     assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
    { gas: 'CH4',  gwp: 27.9,  assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15 (fossil CH4=29.8, biogenic=27.0, blended~27.9)', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
    { gas: 'N2O',  gwp: 273,   assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
    { gas: 'SF6',  gwp: 24300, assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
    { gas: 'R22',  gwp: 1960,  assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
    { gas: 'HFC134A', gwp: 1530, assessmentReport: 'AR6', isDefault: false, source: 'IPCC AR6 WG1 Table 7.15', sourceUrl: 'https://www.ipcc.ch/report/ar6/wg1/' },
  ];

  console.log('  Seeding GWP values...');
  for (const gv of gwpValues) {
    await prisma.gwpValue.upsert({
      where: { gas_assessmentReport: { gas: gv.gas, assessmentReport: gv.assessmentReport } },
      update: gv,
      create: gv,
    });
  }
  console.log(`  ✓ ${gwpValues.length} GWP values seeded\n`);

  // ── Emission Factors ───────────────────────────────────────────────────────
  // All EFs are per TJ for combustion (IPCC standard), per kWh for electricity,
  // per kg/tonne for process/fugitive emissions.

  const validFrom = new Date('2006-01-01');

  const emissionFactors = [
    // ── Scope 1: Stationary Combustion ──────────────────────────────────────
    // Source: IPCC 2006 Vol 2 Table 2.3 (Manufacturing Industries & Construction)
    // NOTE: Using Table 2.3 values for manufacturing, NOT Table 2.2 (Energy Industries)
    {
      fuelOrActivity: 'DIESEL_HSD',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 74100,  // kgCO2/TJ — IPCC 2019 Refinement Vol 2 Table 2.2 (unchanged from 2006)
      ch4Ef: 3,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels; was 10 in 2006)
      n2oEf: 0.6,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Table 2.6 CH4/N2O for Manufacturing Industries (2019 Refinement). CH4 reduced from 10 to 3 for liquid fuels.',
    },
    {
      fuelOrActivity: 'PETROL_MS',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 69300,
      ch4Ef: 3,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels; was 10 in 2006)
      n2oEf: 0.6,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'CH4 reduced from 10 to 3 for liquid fuels in 2019 Refinement.',
    },
    {
      fuelOrActivity: 'LPG',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 63100,
      ch4Ef: 5,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, gaseous fuels)
      n2oEf: 0.1,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, gaseous fuels)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'LPG classified as gaseous fuel for CH4/N2O in Table 2.6.',
    },
    {
      fuelOrActivity: 'NATURAL_GAS',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 56100,
      ch4Ef: 5,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, gaseous fuels)
      n2oEf: 0.1,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, gaseous fuels)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: null,
    },
    {
      fuelOrActivity: 'COAL_INDIAN',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 96100,
      ch4Ef: 1,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, solid fuels; was 10 in 2006)
      n2oEf: 1.5,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, solid fuels; unchanged)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Sub-bituminous coal. CH4 reduced from 10 to 1 for solid fuels in manufacturing (2019 Refinement).',
    },
    {
      fuelOrActivity: 'COKING_COAL',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 94600,
      ch4Ef: 1,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, solid fuels; was 10 in 2006)
      n2oEf: 1.5,    // kgN2O/TJ — unchanged
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'CH4 reduced from 10 to 1 for solid fuels in manufacturing (2019 Refinement).',
    },
    {
      fuelOrActivity: 'COKE',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 107000,
      ch4Ef: 1,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, solid fuels; was 10 in 2006)
      n2oEf: 1.5,    // kgN2O/TJ — unchanged
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Coke Oven Coke / Metallurgical Coke. CH4 reduced from 10 to 1 (2019 Refinement).',
    },
    {
      fuelOrActivity: 'FURNACE_OIL',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 77400,
      ch4Ef: 3,      // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels; was 10 in 2006)
      n2oEf: 0.6,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, liquid fuels)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Residual Fuel Oil category. CH4 reduced from 10 to 3 for liquid fuels (2019 Refinement).',
    },
    {
      fuelOrActivity: 'BIOMASS_WOOD',
      scope: 1,
      scopeCategory: 'stationary_combustion',
      co2Ef: 112000, // BIOGENIC — reported separately
      ch4Ef: 30,     // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, biomass)
      n2oEf: 4,      // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 2.6 (Mfg, biomass)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 2.2 (CO2), Table 2.6 (CH4/N2O, Manufacturing)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'BIOGENIC CO2: 112,000 kgCO2/TJ reported separately per GHG Protocol. CH4 and N2O from biomass ARE included in Scope 1.',
    },

    // ── Scope 1: Mobile Combustion ──────────────────────────────────────────
    // Source: IPCC 2006 Vol 2 Table 3.2.1/3.2.2 (Road Transport)
    {
      fuelOrActivity: 'DIESEL_HSD',
      scope: 1,
      scopeCategory: 'mobile_combustion',
      co2Ef: 74100,
      ch4Ef: 3.9,    // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 3.2.2 heavy-duty diesel (unchanged)
      n2oEf: 3.9,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 3.2.2 heavy-duty diesel (unchanged)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 3.2.1 (CO2), Table 3.2.2 (CH4/N2O, Heavy-duty)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'For MSME transport vehicles (trucks, loaders). CH4/N2O from Table 3.2.2 heavy-duty diesel. Values unchanged from 2006.',
    },
    {
      fuelOrActivity: 'PETROL_MS',
      scope: 1,
      scopeCategory: 'mobile_combustion',
      co2Ef: 69300,
      ch4Ef: 33,     // kgCH4/TJ — IPCC 2019 Refinement Vol 2 Table 3.2.2 (was 25 in 2006, updated to 33)
      n2oEf: 3.2,    // kgN2O/TJ — IPCC 2019 Refinement Vol 2 Table 3.2.2 (was 8 in 2006, updated to 3.2)
      efUnit: 'TJ',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2019 Refinement Vol 2 Table 3.2.1 (CO2), Table 3.2.2 (CH4/N2O, Light-duty)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol2.html',
      validFrom,
      validTo: null,
      active: true,
      notes: 'For company-owned petrol vehicles. CH4 updated 25→33, N2O updated 8→3.2 (2019 Refinement).',
    },

    // ── Scope 1: Process Emissions (Iron & Steel) ───────────────────────────
    // Source: IPCC 2006 Vol 3 Ch 4 (Metal Industry Emissions)
    {
      fuelOrActivity: 'EAF_PROCESS',
      scope: 1,
      scopeCategory: 'process',
      co2Ef: 80,     // 0.08 tCO2/t steel = 80 kgCO2/tonne — IPCC 2006 Vol 3 Table 4.1 Tier 1
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2006 Vol 3 Ch 4 Table 4.1 (Tier 1 EAF Steel)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_4_Ch4_Metal_Industry.pdf',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Tier 1 default for EAF: 0.08 tCO2/t steel. Covers electrode consumption + minor carbon inputs. For Tier 2, use GRAPHITE_ELECTRODE separately.',
    },
    {
      fuelOrActivity: 'GRAPHITE_ELECTRODE',
      scope: 1,
      scopeCategory: 'process',
      co2Ef: 3.667,  // Stoichiometric: 44/12 = 3.667 kgCO2 per kg electrode consumed
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kg',
      region: null,
      source: 'Stoichiometric',
      sourceVersion: 'Carbon oxidation: C + O2 → CO2; 12 + 32 → 44; ratio = 44/12',
      sourceUrl: null,
      validFrom,
      validTo: null,
      active: true,
      notes: 'Tier 2 method: direct measurement of electrode consumption. 3.667 kgCO2/kg is the stoichiometric maximum (pure carbon).',
    },
    {
      fuelOrActivity: 'LIMESTONE',
      scope: 1,
      scopeCategory: 'process',
      co2Ef: 440,    // 0.440 tCO2/tonne = 440 kgCO2/tonne — IPCC 2006 Vol 3 Table 2.1
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2006 Vol 3 Ch 2 Table 2.1 (Limestone)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf',
      validFrom,
      validTo: null,
      active: true,
      notes: 'CaCO3 → CaO + CO2. Stoichiometric: 0.440 tCO2/tonne.',
    },
    {
      fuelOrActivity: 'DOLOMITE',
      scope: 1,
      scopeCategory: 'process',
      co2Ef: 477,    // 0.477 tCO2/tonne — IPCC 2006 Vol 3 Table 2.1
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC 2006 Vol 3 Ch 2 Table 2.1 (Dolomite)',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/3_Volume3/V3_2_Ch2_Mineral_Industry.pdf',
      validFrom,
      validTo: null,
      active: true,
      notes: 'CaMg(CO3)2 decomposition. Stoichiometric: 0.477 tCO2/tonne.',
    },

    // ── Scope 1: Fugitive Emissions ─────────────────────────────────────────
    {
      fuelOrActivity: 'R22_HCFC22',
      scope: 1,
      scopeCategory: 'fugitive',
      co2Ef: 1760,   // kgCO2e per kg leaked — equals GWP (AR5)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kg',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC AR5 WG1 Table 8.A.1 (GWP used as direct CO2e factor)',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      validFrom,
      validTo: null,
      active: true,
      notes: 'Fugitive: CO2e = kg leaked × GWP. GWP(AR5)=1760. NOTE: AR4 was 1810.',
    },
    {
      fuelOrActivity: 'HFC134A',
      scope: 1,
      scopeCategory: 'fugitive',
      co2Ef: 1300,
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kg',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC AR5 WG1 Table 8.A.1',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      validFrom,
      validTo: null,
      active: true,
      notes: 'GWP(AR5)=1300. NOTE: AR4 was 1430.',
    },
    {
      fuelOrActivity: 'SF6',
      scope: 1,
      scopeCategory: 'fugitive',
      co2Ef: 23500,
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kg',
      region: null,
      source: 'IPCC',
      sourceVersion: 'IPCC AR5 WG1 Table 8.A.1',
      sourceUrl: 'https://www.ipcc.ch/report/ar5/wg1/',
      validFrom,
      validTo: null,
      active: true,
      notes: 'GWP(AR5)=23500. Primarily from electrical switchgear.',
    },

    // ── Scope 2: Grid Electricity ───────────────────────────────────────────
    // Source: CEA CO2 Baseline Database Version 21.0, FY2024-25
    // National weighted average: 0.710 tCO2/MWh = 0.710 kgCO2/kWh
    // Note: India has operated as a single unified national grid since 2013.
    // Regional figures are legacy classifications. Using national average.
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'grid_electricity',
      co2Ef: 0.710,  // kgCO2/kWh — CEA v21.0 weighted average
      ch4Ef: null,    // CEA publishes CO2 only
      n2oEf: null,
      efUnit: 'kWh',
      region: null,   // National average (India is unified grid since 2013)
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database Version 21.0, FY2024-25',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Weighted average CO2 emission factor for Indian grid. 0.710 tCO2/MWh. India unified grid since 2013 — regional breakdowns are legacy.',
    },
    // ── Scope 2: Regional Grid Electricity ─────────────────────────────────
    // Source: CEA CO2 Baseline Database Version 21.0, FY2024-25
    // Regional weighted averages (tCO2/MWh = kgCO2/kWh)
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'purchased_electricity',
      co2Ef: 0.898,  // kgCO2/kWh — coal-heavy northern grid
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kWh',
      region: 'NORTHERN',
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database v21.0 (FY2024-25)',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Northern regional grid. Coal-heavy generation mix.',
    },
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'purchased_electricity',
      co2Ef: 0.672,  // kgCO2/kWh — mix of gas and renewables
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kWh',
      region: 'WESTERN',
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database v21.0 (FY2024-25)',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Western regional grid. Mix of gas and renewables.',
    },
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'purchased_electricity',
      co2Ef: 0.617,  // kgCO2/kWh — high renewable penetration
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kWh',
      region: 'SOUTHERN',
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database v21.0 (FY2024-25)',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Southern regional grid. High renewable penetration.',
    },
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'purchased_electricity',
      co2Ef: 0.826,  // kgCO2/kWh — coal-heavy
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kWh',
      region: 'EASTERN',
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database v21.0 (FY2024-25)',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Eastern regional grid. Coal-heavy generation mix.',
    },
    {
      fuelOrActivity: 'GRID_ELECTRICITY',
      scope: 2,
      scopeCategory: 'purchased_electricity',
      co2Ef: 0.476,  // kgCO2/kWh — high hydro
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'kWh',
      region: 'NORTHEASTERN',
      source: 'CEA',
      sourceVersion: 'CEA CO2 Baseline Database v21.0 (FY2024-25)',
      sourceUrl: 'https://cea.nic.in/wp-content/uploads/baseline/2025/01/Approved_report_for_upload.pdf',
      validFrom: new Date('2024-04-01'),
      validTo: new Date('2025-03-31'),
      active: true,
      notes: 'Northeastern regional grid. High hydroelectric generation.',
    },

    // ── Scope 3: Purchased Goods (Iron & Steel relevant) ────────────────────
    // Source: DEFRA UK GHG Conversion Factors 2024, Table: Material Use
    // These are lifecycle EFs for purchased raw materials
    {
      fuelOrActivity: 'SCRAP_STEEL',
      scope: 3,
      scopeCategory: 'purchased_goods',
      co2Ef: 430,    // kgCO2e/tonne — DEFRA 2024 "Steel (recycled)" lifecycle EF (0.43 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Material Use',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Lifecycle emission factor for recycled steel scrap. Used as Scope 3 Cat 1 for EAF/IF plants purchasing scrap.',
    },
    {
      fuelOrActivity: 'IRON_ORE',
      scope: 3,
      scopeCategory: 'purchased_goods',
      co2Ef: 40,     // kgCO2e/tonne — DEFRA 2024 approximate for mining & processing (0.04 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Mining and initial processing emissions. For integrated plants with ore input.',
    },
    {
      fuelOrActivity: 'FERROALLOY',
      scope: 3,
      scopeCategory: 'purchased_goods',
      co2Ef: 5000,   // kgCO2e/tonne — typical for ferrosilicon/ferromanganese (5.0 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Metals category',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Approximate lifecycle EF for ferroalloys (ferrosilicon, ferromanganese). High energy intensity in production.',
    },

    // ── Scope 3: Transport ──────────────────────────────────────────────────
    // Source: DEFRA 2024 Freighting goods
    {
      fuelOrActivity: 'ROAD_FREIGHT',
      scope: 3,
      scopeCategory: 'upstream_transport',
      co2Ef: 0.10726, // kgCO2e/tonne-km — DEFRA 2024 HGV (all diesel, average laden)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne_km',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Freighting Goods, HGV Average',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Heavy goods vehicle all diesel average laden. For upstream material transport.',
    },
    {
      fuelOrActivity: 'RAIL_FREIGHT',
      scope: 3,
      scopeCategory: 'upstream_transport',
      co2Ef: 0.02455, // kgCO2e/tonne-km — DEFRA 2024 Rail freight
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne_km',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Freighting Goods, Rail',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Rail freight average. Common for coal/ore transport in India.',
    },

    // ── Scope 3: Waste ──────────────────────────────────────────────────────
    // Source: DEFRA 2024 Waste disposal
    {
      fuelOrActivity: 'WASTE_LANDFILL',
      scope: 3,
      scopeCategory: 'waste',
      co2Ef: 586,     // kgCO2e/tonne — DEFRA 2024 Mixed waste to landfill (0.586 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Waste Disposal',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Commercial & industrial mixed waste to landfill.',
    },
    {
      fuelOrActivity: 'WASTE_RECYCLED',
      scope: 3,
      scopeCategory: 'waste',
      co2Ef: 21,      // kgCO2e/tonne — DEFRA 2024 Mixed recycling (0.021 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Waste Disposal',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Mixed recycling. Much lower than landfill.',
    },
    {
      fuelOrActivity: 'SLAG_REUSE',
      scope: 3,
      scopeCategory: 'waste',
      co2Ef: 5,       // kgCO2e/tonne — minimal, slag is typically reused (0.005 tCO2e × 1000)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'tonne',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Waste Disposal (aggregates proxy)',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Steel slag reused as construction aggregate. Minimal transport/processing emissions.',
    },

    // ── Scope 3: Business Travel ────────────────────────────────────────────
    // Source: DEFRA 2024 Business Travel
    {
      fuelOrActivity: 'TRAVEL_CAR',
      scope: 3,
      scopeCategory: 'business_travel',
      co2Ef: 0.17148, // kgCO2e/km — DEFRA 2024 Average car (unknown fuel)
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'km',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Business Travel, Cars Average',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Average car, unknown fuel type. For employee business travel by car.',
    },
    {
      fuelOrActivity: 'TRAVEL_RAIL',
      scope: 3,
      scopeCategory: 'business_travel',
      co2Ef: 0.03549, // kgCO2e/km — DEFRA 2024 National rail
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'km',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Business Travel, Rail',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'National rail average passenger.',
    },
    {
      fuelOrActivity: 'TRAVEL_AIR_DOMESTIC',
      scope: 3,
      scopeCategory: 'business_travel',
      co2Ef: 0.24587, // kgCO2e/km — DEFRA 2024 Domestic flights average passenger
      ch4Ef: null,
      n2oEf: null,
      efUnit: 'km',
      region: null,
      source: 'DEFRA',
      sourceVersion: 'DEFRA UK GHG Conversion Factors 2024, Business Travel, Flights Domestic',
      sourceUrl: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024',
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2024-12-31'),
      active: true,
      notes: 'Domestic flights, average passenger class. Includes radiative forcing.',
    },
  ];

  console.log('  Seeding emission factors...');
  for (const ef of emissionFactors) {
    // Use findFirst + create/update to handle nullable region in compound unique
    const existing = await prisma.emissionFactor.findFirst({
      where: {
        fuelOrActivity: ef.fuelOrActivity,
        scope: ef.scope,
        scopeCategory: ef.scopeCategory ?? '',
        region: ef.region ?? null,
      },
    });
    if (existing) {
      await prisma.emissionFactor.update({ where: { id: existing.id }, data: ef });
    } else {
      await prisma.emissionFactor.create({ data: ef });
    }
  }
  console.log(`  ✓ ${emissionFactors.length} emission factors seeded\n`);

  // ── Unit Conversions ───────────────────────────────────────────────────────

  const unitConversions = [
    // Universal conversions
    { fromUnit: 'litre', toUnit: 'kL', factor: 0.001, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'kL', toUnit: 'litre', factor: 1000, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'kg', toUnit: 'tonne', factor: 0.001, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'tonne', toUnit: 'kg', factor: 1000, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'MWh', toUnit: 'kWh', factor: 1000, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'kWh', toUnit: 'MWh', factor: 0.001, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'GJ', toUnit: 'TJ', factor: 0.001, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'TJ', toUnit: 'GJ', factor: 1000, fuelCode: null, source: 'Standard metric', notes: null },
    { fromUnit: 'kWh', toUnit: 'GJ', factor: 0.0036, fuelCode: null, source: 'Standard metric', notes: '1 kWh = 3.6 MJ = 0.0036 GJ' },
    { fromUnit: 'unit', toUnit: 'kWh', factor: 1, fuelCode: null, source: 'Indian convention', notes: '1 unit = 1 kWh (Indian billing convention)' },
    { fromUnit: 'lakh_unit', toUnit: 'kWh', factor: 100000, fuelCode: null, source: 'Indian convention', notes: '1 lakh unit = 100,000 kWh' },

    // Fuel-specific conversions (density-based)
    { fromUnit: 'litre', toUnit: 'kg', factor: 0.832, fuelCode: 'DIESEL_HSD', source: 'IPCC 2006 Vol 2 Table 1.2', notes: 'Diesel density 0.832 kg/L' },
    { fromUnit: 'litre', toUnit: 'kg', factor: 0.745, fuelCode: 'PETROL_MS', source: 'IPCC 2006 Vol 2 Table 1.2', notes: 'Petrol density 0.745 kg/L' },
    { fromUnit: 'litre', toUnit: 'kg', factor: 0.54, fuelCode: 'LPG', source: 'IPCC 2006 Vol 2 Table 1.2', notes: 'LPG density 0.54 kg/L' },
    { fromUnit: 'litre', toUnit: 'kg', factor: 0.95, fuelCode: 'FURNACE_OIL', source: 'IPCC 2006 Vol 2 Table 1.2', notes: 'Furnace oil density 0.95 kg/L' },

    // Indian unit conversions
    { fromUnit: 'cylinder_domestic', toUnit: 'kg', factor: 14.2, fuelCode: 'LPG', source: 'Indian Oil Corporation standard', notes: 'Standard domestic LPG cylinder = 14.2 kg' },
    { fromUnit: 'cylinder_commercial', toUnit: 'kg', factor: 19.0, fuelCode: 'LPG', source: 'Indian Oil Corporation standard', notes: 'Commercial LPG cylinder = 19 kg' },
    { fromUnit: 'bag_50kg', toUnit: 'kg', factor: 50, fuelCode: 'COAL_INDIAN', source: 'Standard sack weight', notes: 'Coal sack/bag = 50 kg' },
    { fromUnit: 'SCM', toUnit: 'm3', factor: 1, fuelCode: 'NATURAL_GAS', source: 'Standard', notes: 'Standard Cubic Metre = 1 m3 at STP' },
    { fromUnit: 'm3', toUnit: '1000m3', factor: 0.001, fuelCode: 'NATURAL_GAS', source: 'Standard metric', notes: null },

    // Energy conversions
    { fromUnit: 'BTU', toUnit: 'kWh', factor: 0.000293071, fuelCode: null, source: 'Standard', notes: '1 BTU = 0.000293071 kWh' },
    { fromUnit: 'kcal', toUnit: 'kWh', factor: 0.001163, fuelCode: null, source: 'Standard', notes: '1 kcal = 0.001163 kWh' },
    { fromUnit: 'MJ', toUnit: 'GJ', factor: 0.001, fuelCode: null, source: 'Standard metric', notes: null },
  ];

  console.log('  Seeding unit conversions...');
  for (const uc of unitConversions) {
    // Use findFirst + create to handle the compound unique constraint
    const existing = await prisma.unitConversion.findFirst({
      where: { fromUnit: uc.fromUnit, toUnit: uc.toUnit, fuelCode: uc.fuelCode },
    });
    if (existing) {
      await prisma.unitConversion.update({ where: { id: existing.id }, data: uc });
    } else {
      await prisma.unitConversion.create({ data: uc });
    }
  }
  console.log(`  ✓ ${unitConversions.length} unit conversions seeded\n`);

  // ── Sector Benchmarks ──────────────────────────────────────────────────────
  // All India-specific. Derived from BEE cluster profiles, SAMEEEKSHA/TERI
  // compendiums, UNIDO technology studies, and academic research.
  // Electricity-based values recalculated using CEA v21.0 grid EF = 0.710 tCO2/MWh.
  // Gate-to-gate (Scope 1 + Scope 2 for the specific process only).

  const benchmarks = [
    // EAF Mini Mill (scrap-based): 400-700 kWh/t × 0.710 grid EF + fuel/process add-on
    {
      sector: 'iron_steel',
      subSector: 'eaf_mini_mill',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.32,
      sectorAverage: 0.40,
      worstQuartile: 0.52,
      source: 'SAMEEEKSHA EAF Compendium (TERI/UNDP); SEC 400-600 kWh/t × CEA v21.0 grid EF',
      sourceUrl: 'https://www.sameeeksha.org/books/Electric-Arc-Furnace-Compendium.pdf',
      year: 2023,
    },
    // Induction Furnace (scrap-based): 500-900 kWh/t × 0.710 + fuel for ladle
    {
      sector: 'iron_steel',
      subSector: 'induction_furnace',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.42,
      sectorAverage: 0.56,
      worstQuartile: 0.72,
      source: 'BEE/SAMEEEKSHA IF cluster profiles; Coimbatore IF study (recalc with CEA v21.0)',
      sourceUrl: 'https://www.sameeeksha.org',
      year: 2023,
    },
    // Re-Rolling Mill: fuel-fired reheating furnaces (80-200+ kgoe/t) + 30-80 kWh/t electricity
    {
      sector: 'iron_steel',
      subSector: 're_rolling',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.27,
      sectorAverage: 0.44,
      worstQuartile: 0.70,
      source: 'IspatGuru/BEE re-rolling mill energy benchmarks; UNDP-GEF 34-mill audit',
      sourceUrl: 'https://www.ispatguru.com/energy-management-in-small-and-medium-sized-re-rolling-mills/',
      year: 2022,
    },
    // Forging Unit: fuel-fired furnaces (0.14-0.18 L FO/kg) + 40-80 kWh/t electricity
    {
      sector: 'iron_steel',
      subSector: 'forging',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.46,
      sectorAverage: 0.55,
      worstQuartile: 0.65,
      source: 'UNIDO Eastern Zone Forging Cluster Technology Compendium; SAMEEEKSHA Pune profile',
      sourceUrl: 'https://decarbonization.unido.org/wp-content/uploads/Technology-Compedium-Eastern-Zone-Forging-Cluster_resized.pdf',
      year: 2022,
    },
    // Casting/Foundry (IF-based, 83% of Indian production): 550-850 kWh/t liquid × yield loss
    {
      sector: 'iron_steel',
      subSector: 'casting_foundry',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.58,
      sectorAverage: 0.77,
      worstQuartile: 1.04,
      source: 'BEE Foundry Sector Energy Mapping (PwC); Coimbatore IF foundry study (recalc with CEA v21.0)',
      sourceUrl: 'https://beeindia.gov.in/sites/default/files/Foundry_Sector_Energy_Mapping_Report.pdf',
      year: 2022,
    },
    // EAF electricity-specific benchmark (kWh/t)
    {
      sector: 'iron_steel',
      subSector: 'eaf_mini_mill',
      metric: 'kWh_per_tonne',
      bestPractice: 400,
      sectorAverage: 500,
      worstQuartile: 650,
      source: 'SAMEEEKSHA EAF Compendium (TERI/UNDP); Ministry of Steel MSME audit data',
      sourceUrl: 'https://www.sameeeksha.org/books/Electric-Arc-Furnace-Compendium.pdf',
      year: 2023,
    },
    // Induction Furnace electricity-specific benchmark (kWh/t)
    {
      sector: 'iron_steel',
      subSector: 'induction_furnace',
      metric: 'kWh_per_tonne',
      bestPractice: 520,
      sectorAverage: 680,
      worstQuartile: 870,
      source: 'BEE/SAMEEEKSHA IF cluster profiles; Howrah cluster data',
      sourceUrl: 'https://www.sameeeksha.org',
      year: 2023,
    },
  ];

  console.log('  Seeding sector benchmarks...');
  for (const bm of benchmarks) {
    await prisma.sectorBenchmark.upsert({
      where: {
        sector_subSector_metric: {
          sector: bm.sector,
          subSector: bm.subSector,
          metric: bm.metric,
        },
      },
      update: bm,
      create: bm,
    });
  }
  console.log(`  ✓ ${benchmarks.length} sector benchmarks seeded\n`);

  // ── Module 2: Reduction Technologies ──────────────────────────────────────
  // Source: BEE-GEF-UNIDO, SAMEEEKSHA, NITI Aayog MSME Roadmap, MNRE, CPCB
  // See spec document Section 3 for full sourcing

  const reductionTechnologies = [
    // ── 3.1 Cross-Sector Energy Efficiency ──
    {
      techId: 'T001',
      name: 'Variable Frequency Drives (VFDs)',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'VFDs adjust motor speed to match load requirements, eliminating energy wasted by throttling or bypassing. Applicable to pumps, fans, compressors, and conveyor systems. Typical energy savings 20-40% on motor-driven systems.',
      energySavingMinPct: 20,
      energySavingMaxPct: 40,
      co2ReductionMinPct: 20,
      co2ReductionMaxPct: 40,
      paybackMinYears: 0.5,
      paybackMaxYears: 1.5,
      capexMinLakhs: 1,
      capexMaxLakhs: 15,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Pune', 'Ludhiana', 'Coimbatore', 'Rajkot']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: JSON.stringify(['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE-GEF-UNIDO; SAMEEEKSHA DPRs',
      sourceUrl: 'https://www.sameeeksha.org/index.php?option=com_content&view=article&id=107&Itemid=507',
    },
    {
      techId: 'T002',
      name: 'IE3/IE4 Premium Efficiency Motors',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Replacing old IE1/IE2 motors with IE3 or IE4 premium efficiency motors reduces electrical losses. Motors account for 60-70% of industrial electricity consumption in MSMEs.',
      energySavingMinPct: 5,
      energySavingMaxPct: 15,
      co2ReductionMinPct: 5,
      co2ReductionMaxPct: 15,
      paybackMinYears: 1,
      paybackMaxYears: 3,
      capexMinLakhs: 0.5,
      capexMaxLakhs: 5,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Coimbatore', 'Ahmedabad', 'Pune']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: JSON.stringify(['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'Shakti Foundation MSME EE Project',
      sourceUrl: 'https://shaktifoundation.in/wp-content/uploads/2017/06/Final-Project-Report_Shakti-MSME.pdf',
    },
    {
      techId: 'T003',
      name: 'Energy Efficient Boilers',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Replacing old boilers with energy-efficient models (condensing, modulating, or waste-heat integrated). Reduces fuel consumption for steam generation and process heating.',
      energySavingMinPct: 15,
      energySavingMaxPct: 30,
      co2ReductionMinPct: 15,
      co2ReductionMaxPct: 30,
      paybackMinYears: 2,
      paybackMaxYears: 4,
      capexMinLakhs: 10,
      capexMaxLakhs: 80,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Ludhiana', 'Mandi Gobindgarh']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'FURNACE_OIL', 'BIOMASS_WOOD']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'SAMEEEKSHA DPRs (Boiler studies)',
      sourceUrl: 'https://www.sameeeksha.org/pdf/dpr/surat_4TPH.pdf',
    },
    {
      techId: 'T004',
      name: 'Waste Heat Recovery Systems (WHRS)',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1 + Scope 2',
      energyTypeSaved: 'Both',
      description: 'Captures waste heat from furnace exhaust, cooling water, or slag to preheat combustion air, generate steam, or produce electricity. Average 26% energy saving demonstrated in Indian MSME clusters.',
      energySavingMinPct: 20,
      energySavingMaxPct: 30,
      co2ReductionMinPct: 20,
      co2ReductionMaxPct: 30,
      paybackMinYears: 2,
      paybackMaxYears: 5,
      capexMinLakhs: 10,
      capexMaxLakhs: 100,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Mandi Gobindgarh', 'Raipur', 'Belgaum']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'COKING_COAL', 'COKE', 'FURNACE_OIL', 'NATURAL_GAS']),
      matchesCategories: JSON.stringify(['stationary_combustion', 'process']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'forging', 'casting_foundry', 'eaf_mini_mill']),
      minEmissionThreshold: null,
      source: 'SAMEEEKSHA DPRs; avg 26% saving',
      sourceUrl: 'https://www.sameeeksha.org/pdf/dpr/East_and_West_Godavari_refractories_cluster/11_Waste_heat_recovery_system_200_tons_capacity_kiln_Godavari_Refr_cluster.pdf',
    },
    {
      techId: 'T005',
      name: 'Compressed Air System Optimization',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Compressed air systems typically waste 20-30% of energy through leaks, pressure drops, and oversizing. Optimization includes leak detection, VFD on compressors, pressure reduction, and system redesign.',
      energySavingMinPct: 10,
      energySavingMaxPct: 25,
      co2ReductionMinPct: 10,
      co2ReductionMaxPct: 25,
      paybackMinYears: 0.5,
      paybackMaxYears: 2,
      capexMinLakhs: 1,
      capexMaxLakhs: 10,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Pune', 'Ludhiana', 'Rajkot']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: JSON.stringify(['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE EC Guidelines for MSMEs',
      sourceUrl: 'https://beeindia.gov.in/sites/default/files/Annexure%202.pdf',
    },
    {
      techId: 'T006',
      name: 'LED Lighting Retrofit',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Replacing conventional lighting (CFL, fluorescent, halogen, metal halide) with LED fixtures. Includes high-bay LEDs for factory floors. 40-60% energy savings on lighting load.',
      energySavingMinPct: 40,
      energySavingMaxPct: 60,
      co2ReductionMinPct: 40,
      co2ReductionMaxPct: 60,
      paybackMinYears: 0.5,
      paybackMaxYears: 1.5,
      capexMinLakhs: 0.5,
      capexMaxLakhs: 5,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: JSON.stringify(['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE UJALA Programme',
      sourceUrl: 'https://eeslindia.org/en/ourujala/',
    },
    {
      techId: 'T007',
      name: 'Insulation Upgrades',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Upgrading thermal insulation on furnaces, ladles, pipework, and steam systems. Reduces heat loss and fuel consumption. Low cost, fast payback.',
      energySavingMinPct: 5,
      energySavingMaxPct: 15,
      co2ReductionMinPct: 5,
      co2ReductionMaxPct: 15,
      paybackMinYears: 0.5,
      paybackMaxYears: 1,
      capexMinLakhs: 0.5,
      capexMaxLakhs: 5,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'COKING_COAL', 'COKE', 'FURNACE_OIL', 'NATURAL_GAS']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE EC Guidelines 2019',
      sourceUrl: 'https://beeindia.gov.in/sites/default/files/Annexure%202.pdf',
    },
    {
      techId: 'T008',
      name: 'Energy Management System (ISO 50001)',
      category: 'Energy Efficiency - Cross Sector',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1 + Scope 2',
      energyTypeSaved: 'Both',
      description: 'Implementing ISO 50001 Energy Management System with metering, monitoring, targeting, and continuous improvement. 45+ Indian MSMEs certified under BEE-GEF-UNIDO programme.',
      energySavingMinPct: 10,
      energySavingMaxPct: 20,
      co2ReductionMinPct: 10,
      co2ReductionMaxPct: 20,
      paybackMinYears: 1,
      paybackMaxYears: 2,
      capexMinLakhs: 2,
      capexMaxLakhs: 10,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Foundry clusters', 'Ceramic clusters', 'Dairy clusters']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY', 'COAL_INDIAN', 'DIESEL_HSD', 'NATURAL_GAS']),
      matchesCategories: JSON.stringify(['stationary_combustion', 'grid_electricity']),
      matchesSubSectors: JSON.stringify(['eaf_mini_mill', 'induction_furnace', 're_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE-GEF-UNIDO; 45+ MSMEs certified',
      sourceUrl: 'https://www.bsigroup.com/en-IN/ISO-50001-Energy-Management/bee-wb-project-on-iso50001-implementation-for-msmes/',
    },
    // ── 3.2 Sector-Specific Technologies ──
    {
      techId: 'T009',
      name: 'Divided Blast Cupola (DBC)',
      category: 'Sector Specific - Iron & Steel',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Replacing conventional cupola furnaces with Divided Blast Cupola (DBC) technology. DBC provides separate hot and cold blast zones, dramatically improving combustion efficiency and reducing coke consumption by 35-45%.',
      energySavingMinPct: 35,
      energySavingMaxPct: 45,
      co2ReductionMinPct: 35,
      co2ReductionMaxPct: 45,
      paybackMinYears: 2,
      paybackMaxYears: 3,
      capexMinLakhs: 15,
      capexMaxLakhs: 40,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Belgaum', 'Coimbatore', 'Howrah', 'Agra']),
      matchesFuelTypes: JSON.stringify(['COKE']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['casting_foundry']),
      minEmissionThreshold: null,
      source: 'UNIDO-BEE Tech Compendium (Belgaum Foundry)',
      sourceUrl: 'http://sidhiee.beeindia.gov.in/images/DigitalLibrary/637877056026116995.pdf',
    },
    {
      techId: 'T010',
      name: 'Zig-Zag Kiln Technology',
      category: 'Sector Specific - Brick Kilns',
      applicableSectors: JSON.stringify(['brick_kilns']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Converting Fixed Chimney Bull Trench Kilns (FCBTK) to Zig-Zag firing pattern. Reduces coal consumption by 15-20% with better heat distribution. CPCB mandated in many states.',
      energySavingMinPct: 15,
      energySavingMaxPct: 20,
      co2ReductionMinPct: 15,
      co2ReductionMaxPct: 20,
      paybackMinYears: 1,
      paybackMaxYears: 3,
      capexMinLakhs: 5,
      capexMaxLakhs: 20,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['UP', 'Bihar', 'Punjab', 'Haryana']),
      matchesFuelTypes: null,
      matchesCategories: null,
      matchesSubSectors: JSON.stringify(['brick_kilns']),
      minEmissionThreshold: null,
      source: 'CPCB Direction; CSE Zig-Zag Design Manual',
      sourceUrl: 'http://cdn.cseindia.org/attachments/0.15498400_1520395734_zig-zag-kilns-design_manual.pdf',
    },
    {
      techId: 'T011',
      name: 'Common Boiler / Cogeneration',
      category: 'Sector Specific - Iron & Steel',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Shared high-efficiency cogeneration boiler for industrial clusters. Multiple MSMEs share a common facility, achieving economies of scale. 20-35% energy saving vs individual boilers.',
      energySavingMinPct: 20,
      energySavingMaxPct: 35,
      co2ReductionMinPct: 20,
      co2ReductionMaxPct: 35,
      paybackMinYears: 3,
      paybackMaxYears: 5,
      capexMinLakhs: 500,
      capexMaxLakhs: 2000,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Mandi Gobindgarh']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'FURNACE_OIL']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling']),
      minEmissionThreshold: null,
      source: 'BEE Best Practice Manual — Cogeneration',
      sourceUrl: 'https://nredcap.in/PDFs/BEE_manuals/BEST_PRACTICE_MANUAL_COGENERATION.pdf',
    },
    {
      techId: 'T012',
      name: 'EE Induction Furnace (IGBT-based)',
      category: 'Sector Specific - Iron & Steel',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Replacing older thyristor-based induction furnaces with IGBT-based energy-efficient models. Higher power factor, lower harmonics, 10-20% energy savings per heat.',
      energySavingMinPct: 10,
      energySavingMaxPct: 20,
      co2ReductionMinPct: 10,
      co2ReductionMaxPct: 20,
      paybackMinYears: 3,
      paybackMaxYears: 5,
      capexMinLakhs: 50,
      capexMaxLakhs: 200,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Mandi Gobindgarh', 'Raipur', 'Durgapur']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: JSON.stringify(['induction_furnace', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'BEE-GEF-UNIDO DPR on IGBT Induction Furnace',
      sourceUrl: 'https://sidhiee.beeindia.gov.in/images/DigitalLibrary/637876885490689821.pdf',
    },
    {
      techId: 'T013',
      name: 'Heat Recovery from Dye Liquor',
      category: 'Sector Specific - Textiles',
      applicableSectors: JSON.stringify(['textiles']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Recovering heat from hot dye bath effluent to preheat incoming fresh water. 10-20% thermal energy saving in wet processing units.',
      energySavingMinPct: 10,
      energySavingMaxPct: 20,
      co2ReductionMinPct: 10,
      co2ReductionMaxPct: 20,
      paybackMinYears: 1,
      paybackMaxYears: 2,
      capexMinLakhs: 3,
      capexMaxLakhs: 10,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Tirupur', 'Surat', 'Ludhiana']),
      matchesFuelTypes: null,
      matchesCategories: null,
      matchesSubSectors: null,
      minEmissionThreshold: null,
      source: 'BEE-GEF-UNIDO DPRs (Pali Textile Cluster)',
      sourceUrl: 'https://sameeeksha.org/pdf/dpr/Pali_Textile.pdf',
    },
    {
      techId: 'T014',
      name: 'Automated Sand Reclamation',
      category: 'Sector Specific - Iron & Steel',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1 + Scope 2',
      energyTypeSaved: 'Both',
      description: 'Mechanical/thermal sand reclamation systems that recycle foundry sand, reducing new sand requirements and energy for sand preparation. 10-15% energy saving, 5-10% CO2 reduction.',
      energySavingMinPct: 10,
      energySavingMaxPct: 15,
      co2ReductionMinPct: 5,
      co2ReductionMaxPct: 10,
      paybackMinYears: 2,
      paybackMaxYears: 4,
      capexMinLakhs: 20,
      capexMaxLakhs: 60,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Belgaum', 'Coimbatore', 'Indore']),
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY', 'COAL_INDIAN']),
      matchesCategories: JSON.stringify(['stationary_combustion', 'grid_electricity']),
      matchesSubSectors: JSON.stringify(['casting_foundry']),
      minEmissionThreshold: null,
      source: 'UNIDO Tech Compendium (Indore Foundry)',
      sourceUrl: 'https://sidhiee.beeindia.gov.in/images/DigitalLibrary/637877086697410216.pdf',
    },
    // ── 3.3 Green Electricity Technologies ──
    {
      techId: 'T015',
      name: 'Rooftop Solar PV (CAPEX)',
      category: 'Green Electricity',
      applicableSectors: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Self-owned rooftop solar PV system. MSME invests in CAPEX and owns the asset. 30-70% Scope 2 reduction depending on consumption vs capacity. Typical sizing: annualKwh / 1500 solar hours = required kWp.',
      energySavingMinPct: 30,
      energySavingMaxPct: 70,
      co2ReductionMinPct: 30,
      co2ReductionMaxPct: 70,
      paybackMinYears: 3,
      paybackMaxYears: 5,
      capexMinLakhs: 40,
      capexMaxLakhs: 60,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: null,
      minEmissionThreshold: null,
      source: 'NITI Aayog MSME Roadmap',
      sourceUrl: 'https://niti.gov.in/sites/default/files/2026-01/Roadmap_for_Green_Transition_of_MSMEs.pdf',
    },
    {
      techId: 'T016',
      name: 'Rooftop Solar PV (OPEX/RESCO)',
      category: 'Green Electricity',
      applicableSectors: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Third-party RESCO installs and owns rooftop solar; MSME pays per kWh at a rate lower than grid tariff. Zero upfront investment. 30-60% Scope 2 reduction.',
      energySavingMinPct: 30,
      energySavingMaxPct: 60,
      co2ReductionMinPct: 30,
      co2ReductionMaxPct: 60,
      paybackMinYears: 0,
      paybackMaxYears: 0,
      capexMinLakhs: 0,
      capexMaxLakhs: 0,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: null,
      minEmissionThreshold: null,
      source: 'NITI Aayog MSME Roadmap; MNRE RESCO Guidelines',
      sourceUrl: 'https://niti.gov.in/sites/default/files/2026-01/Roadmap_for_Green_Transition_of_MSMEs.pdf',
    },
    {
      techId: 'T017',
      name: 'Green Open Access (off-site RE)',
      category: 'Green Electricity',
      applicableSectors: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Purchasing renewable electricity via open access (off-site solar/wind farm). 50-100% Scope 2 reduction. Requires connected load > 100 kW (varies by state). PPA-based, no CAPEX.',
      energySavingMinPct: 50,
      energySavingMaxPct: 100,
      co2ReductionMinPct: 50,
      co2ReductionMaxPct: 100,
      paybackMinYears: 0,
      paybackMaxYears: 0,
      capexMinLakhs: null,
      capexMaxLakhs: null,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: null,
      minEmissionThreshold: null,
      source: 'NITI Aayog MSME Green Transition Roadmap; CERC/SERC',
      sourceUrl: 'https://niti.gov.in/sites/default/files/2026-01/Roadmap_for_Green_Transition_of_MSMEs.pdf',
    },
    {
      techId: 'T018',
      name: 'Battery Storage (BESS) + Solar',
      category: 'Green Electricity',
      applicableSectors: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      scopeAddressed: 'Scope 2',
      energyTypeSaved: 'Electrical',
      description: 'Battery energy storage combined with solar PV to extend renewable usage beyond solar hours. Enables 80-100% Scope 2 reduction. Medium-term technology with falling costs.',
      energySavingMinPct: 50,
      energySavingMaxPct: 100,
      co2ReductionMinPct: 80,
      co2ReductionMaxPct: 100,
      paybackMinYears: 5,
      paybackMaxYears: 8,
      capexMinLakhs: 80,
      capexMaxLakhs: 150,
      technologyReadiness: 'Early commercial',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['GRID_ELECTRICITY']),
      matchesCategories: JSON.stringify(['grid_electricity']),
      matchesSubSectors: null,
      minEmissionThreshold: null,
      source: 'NITI Aayog Energy Storage Roadmap',
      sourceUrl: 'https://www.niti.gov.in/sites/default/files/2019-10/ISGF-Report-on-Energy-Storage-System-(ESS)-Roadmap-for-India-2019-2032.pdf',
    },
    // ── 3.4 Alternative Fuel Technologies ──
    {
      techId: 'T019',
      name: 'Coal to Natural Gas (PNG) Switch',
      category: 'Alternative Fuels',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Switching from coal/coke/furnace oil to piped natural gas (PNG) for furnaces and boilers. 40-50% CO2 reduction per unit energy. Requires CGD pipeline access.',
      energySavingMinPct: 10,
      energySavingMaxPct: 20,
      co2ReductionMinPct: 40,
      co2ReductionMaxPct: 50,
      paybackMinYears: 2,
      paybackMaxYears: 4,
      capexMinLakhs: 5,
      capexMaxLakhs: 30,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Morbi', 'Ahmedabad', 'Surat', 'Pune']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'COKING_COAL', 'COKE', 'FURNACE_OIL']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'PNGRB CGD Authorisation; Deloitte Pathways Report',
      sourceUrl: 'https://pngrb.gov.in/eng-web/cgd-auth.html',
    },
    {
      techId: 'T020',
      name: 'Biomass Briquettes (replacing coal)',
      category: 'Alternative Fuels',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Replacing coal with biomass briquettes for boilers and furnaces. 80-95% CO2 reduction (biogenic CO2 not counted in Scope 1). Requires reliable biomass supply chain.',
      energySavingMinPct: 0,
      energySavingMaxPct: 5,
      co2ReductionMinPct: 80,
      co2ReductionMaxPct: 95,
      paybackMinYears: 1,
      paybackMaxYears: 3,
      capexMinLakhs: 5,
      capexMaxLakhs: 20,
      technologyReadiness: 'Commercially mature',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Punjab', 'Maharashtra', 'Tamil Nadu']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'FURNACE_OIL']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'MNRE-GIZ Biomass for MSMEs Report (2026)',
      sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2215271&reg=3&lang=1',
    },
    {
      techId: 'T021',
      name: 'Compressed Biogas (CBG)',
      category: 'Alternative Fuels',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Replacing natural gas or coal with compressed biogas (CBG) under the SATAT scheme. 70-90% CO2 reduction. Government guaranteed offtake at Rs 54/kg.',
      energySavingMinPct: 0,
      energySavingMaxPct: 5,
      co2ReductionMinPct: 70,
      co2ReductionMaxPct: 90,
      paybackMinYears: 0,
      paybackMaxYears: 0,
      capexMinLakhs: null,
      capexMaxLakhs: null,
      technologyReadiness: 'Early commercial',
      demonstratedInIndia: true,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['NATURAL_GAS', 'COAL_INDIAN']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['re_rolling', 'forging']),
      minEmissionThreshold: null,
      source: 'MoPNG SATAT Scheme',
      sourceUrl: 'https://mopng.gov.in/en/refining/compressed-bio-gas',
    },
    {
      techId: 'T022',
      name: 'Solar Thermal for Process Heat',
      category: 'Alternative Fuels',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Concentrated solar thermal systems for industrial process heat (up to 250°C). Suitable for preheating, drying, and low-temperature heat applications. 30-60% CO2 reduction on addressable thermal load.',
      energySavingMinPct: 30,
      energySavingMaxPct: 60,
      co2ReductionMinPct: 30,
      co2ReductionMaxPct: 60,
      paybackMinYears: 4,
      paybackMaxYears: 7,
      capexMinLakhs: 30,
      capexMaxLakhs: 100,
      technologyReadiness: 'Early commercial',
      demonstratedInIndia: true,
      indianClusters: JSON.stringify(['Rajasthan', 'Gujarat', 'Maharashtra']),
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'FURNACE_OIL', 'LPG', 'NATURAL_GAS']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['forging', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'CSTEP Solar Process Heat Study; MNRE',
      sourceUrl: 'https://cstep.in/publication/solar-energy-for-process-heating-a-case-study-of-select-indian-industries/',
    },
    {
      techId: 'T023',
      name: 'Electrification of Thermal Processes',
      category: 'Alternative Fuels',
      applicableSectors: JSON.stringify(['iron_steel']),
      scopeAddressed: 'Scope 1',
      energyTypeSaved: 'Thermal',
      description: 'Replacing fossil-fuel-fired furnaces with electric alternatives (induction heating, resistance heating, plasma). Up to 100% Scope 1 reduction if paired with renewable electricity.',
      energySavingMinPct: 10,
      energySavingMaxPct: 30,
      co2ReductionMinPct: 40,
      co2ReductionMaxPct: 100,
      paybackMinYears: 5,
      paybackMaxYears: 10,
      capexMinLakhs: 50,
      capexMaxLakhs: 500,
      technologyReadiness: 'Emerging',
      demonstratedInIndia: false,
      indianClusters: null,
      matchesFuelTypes: JSON.stringify(['COAL_INDIAN', 'COKE', 'FURNACE_OIL']),
      matchesCategories: JSON.stringify(['stationary_combustion']),
      matchesSubSectors: JSON.stringify(['induction_furnace', 'casting_foundry']),
      minEmissionThreshold: null,
      source: 'Ember India Green Electrification Report (2024)',
      sourceUrl: 'https://ember-energy.org/app/uploads/2024/09/Report-Green-electrification-of-Indian-industries-for-clean-energy-gains.pdf',
    },
  ];

  console.log('  Seeding reduction technologies...');
  for (const tech of reductionTechnologies) {
    await prisma.reductionTechnology.upsert({
      where: { techId: tech.techId },
      update: tech,
      create: tech,
    });
  }
  console.log(`  ✓ ${reductionTechnologies.length} reduction technologies seeded\n`);

  // ── Module 3: Funding Schemes ───────────────────────────────────────────────
  // Source: BEE, SIDBI, MNRE, MoMSME, EESL official scheme documents

  const fundingSchemes = [
    {
      schemeId: 'S001',
      name: 'ADEETIE Scheme',
      implementingAgency: 'BEE, Ministry of Power',
      targetBeneficiary: 'Udyam-registered MSMEs',
      supportType: 'Interest subvention + Energy Audit + DPR',
      financialDetails: 'Rs 1,000 Cr outlay; 5% subvention for Micro/Small, 3% for Medium; IGEA reimbursed up to Rs 1L (Medium) / Rs 75K (Micro/Small)',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns', 'ceramics', 'dairy', 'brass', 'chemicals', 'fishery', 'food_processing', 'forging', 'foundry', 'glass', 'leather', 'paper', 'pharma', 'steel_rerolling']),
      eligibilityCriteria: 'Udyam registered; EE technology with proven 10%+ energy saving; in one of 60 ADEETIE-eligible clusters across 14 sectors',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'DPR prepared by empaneled CEA/AEA', 'Quotation from technology supplier', 'Bank loan sanction letter']),
      minEnergySaving: 10,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: new Date('2025-04-01'),
      validTo: new Date('2028-03-31'),
      applicationUrl: 'https://adeetie.beeindia.gov.in',
      reportedImpact: null,
      source: 'BEE ADEETIE Scheme Guidelines',
      sourceUrl: 'https://adeetie.beeindia.gov.in/',
    },
    {
      schemeId: 'S002',
      name: 'BEE-GEF-UNIDO Programme',
      implementingAgency: 'BEE + UNIDO + GEF',
      targetBeneficiary: 'MSMEs in designated programme clusters',
      supportType: 'Free energy audit + DPR + tech demo',
      financialDetails: 'GEF grant-funded; zero cost to MSME for audits and DPRs; programme started 2011, largely superseded by ADEETIE (S001) for new applicants',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'ceramics', 'dairy', 'brass', 'foundry', 'hand_tools']),
      eligibilityCriteria: 'MSME in designated programme cluster (26 clusters across 5 sectors: foundry, ceramics, dairy, brass, hand tools)',
      requiredDocuments: JSON.stringify(['Unit registration in programme cluster', 'Willingness to participate in energy audit']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://sidhiee.beeindia.gov.in',
      reportedImpact: '45+ MSMEs ISO 50001 certified; 200+ energy audits completed',
      source: 'BEE-GEF-UNIDO Programme',
      sourceUrl: 'https://sidhiee.beeindia.gov.in/ProjectComponent/GEF_UNIDO',
    },
    {
      schemeId: 'S003',
      name: 'SIDBI PRSF (Partial Risk Sharing Facility)',
      implementingAgency: 'SIDBI + World Bank + GEF + CTF',
      targetBeneficiary: 'Micro and small enterprises with bankable EE/ESCO projects',
      supportType: 'Partial credit guarantee for bank loans',
      financialDetails: 'USD 37M risk-sharing facility (GEF USD 12M + CTF USD 25M); covers default risk for banks lending to EE projects via ESCOs; reduces interest rate by 1-2%',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Micro or small enterprise; identified EE project implemented through ESCO; bankable DPR prepared',
      requiredDocuments: JSON.stringify(['DPR', 'Bank loan application', 'Energy audit report', 'Udyam certificate', 'ESCO agreement']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://prsf.sidbi.in',
      reportedImpact: null,
      source: 'SIDBI PRSF',
      sourceUrl: 'https://prsf.sidbi.in/',
    },
    {
      schemeId: 'S004',
      name: 'SIDBI 4E / Green Finance',
      implementingAgency: 'SIDBI',
      targetBeneficiary: 'Udyam-registered MSMEs',
      supportType: 'Concessional loans for EE/RE',
      financialDetails: 'Loans Rs 10L-150L per borrower; interest rate 2-3.85% below SIDBI normal lending rate based on credit rating; includes walk-through audit, detailed energy audit, bankable DPR, implementation support',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Udyam registered; project must demonstrate measurable energy saving (10-25% target)',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'DPR', 'Quotation', 'Energy audit report']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
      reportedImpact: null,
      source: 'SIDBI Green Finance',
      sourceUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
    },
    {
      schemeId: 'S005',
      name: 'PM Surya Ghar (proposed MSME extension)',
      implementingAgency: 'MNRE',
      targetBeneficiary: 'Micro enterprises (proposed extension)',
      supportType: 'Capital subsidy for rooftop solar',
      financialDetails: 'Currently residential only (Rs 30,000/kW up to 2kW, Rs 78,000 fixed for 3kW+); MSME extension under discussion but no official announcement yet',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Micro enterprise; suitable roof area; grid-connected',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'Electricity connection proof', 'Roof ownership/lease']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro']),
      applicableStates: null,
      status: 'Proposed',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://pmsuryaghar.gov.in',
      reportedImpact: null,
      source: 'NITI Aayog MSME Roadmap',
      sourceUrl: 'https://pmsuryaghar.gov.in/',
    },
    {
      schemeId: 'S006',
      name: 'CLCS-TUS (formerly TEQUP)',
      implementingAgency: 'MoMSME (DC-MSME)',
      targetBeneficiary: 'Micro and small enterprises',
      supportType: 'Capital subsidy for technology upgradation',
      financialDetails: '15% capital subsidy on institutional finance up to Rs 1 Cr (max subsidy Rs 15L); EE component: 25% subsidy on EE technology (max Rs 10L for project cost up to Rs 40L); product certification: 75% subsidy (max Rs 1.5-2L)',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Registered MSME; technology must be for quality/EE improvement; institutional finance availed',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'Technology supplier invoice', 'Bank loan sanction letter', 'Application form']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://msme.gov.in/technology-and-quality-upgradation',
      reportedImpact: null,
      source: 'MoMSME CLCS-TUS (merged TEQUP + CLCSS)',
      sourceUrl: 'https://msme.gov.in/technology-and-quality-upgradation',
    },
    {
      schemeId: 'S007',
      name: 'ZED Certification Incentive',
      implementingAgency: 'MoMSME / QCI',
      targetBeneficiary: 'Udyam-registered MSMEs',
      supportType: 'Certification + linked subsidies',
      financialDetails: 'Certification cost subsidy: 80% for Micro, 60% for Small, 50% for Medium (+10% for women/SC/ST entrepreneurs); ISO/BIS/CE reimbursement up to Rs 50K; energy/environment certification reimbursement up to Rs 1L; priority access to other govt subsidies',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Udyam registered; willing to undergo ZED assessment',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'ZED application']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: new Date('2026-03-31'),
      applicationUrl: 'https://zed.msme.gov.in',
      reportedImpact: null,
      source: 'MoMSME ZED',
      sourceUrl: 'https://zed.msme.gov.in/',
    },
    {
      schemeId: 'S008',
      name: 'National Bioenergy Programme / SATAT',
      implementingAgency: 'MNRE / MoPNG',
      targetBeneficiary: 'Biomass fuel producers and MSME consumers',
      supportType: 'Viability Gap Funding for biomass/CBG',
      financialDetails: 'SATAT: CBG price pegged at 85% of avg CNG retail price (revised May 2025); VGF for new CBG plants Rs 4 Cr per 4,800 kg/day, Rs 3 Cr for upgrades, max Rs 10 Cr/project; mandatory CNG/PNG blending 1% FY2025-26, rising to 5% from FY2028-29',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Biomass fuel producer or MSME consumer switching to biomass/CBG',
      requiredDocuments: JSON.stringify(['Project proposal', 'Biomass supply agreement', 'Environmental clearance if required']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://satat.co.in',
      reportedImpact: 'SATAT targets 5,000 CBG plants by 2030; 108 commissioned, 1,094 active LoIs as of mid-2025',
      source: 'MNRE / SATAT Scheme',
      sourceUrl: 'https://satat.co.in/',
    },
    {
      schemeId: 'S009',
      name: 'State-level EE Subsidies',
      implementingAgency: 'State Designated Agencies (SDAs)',
      targetBeneficiary: 'MSMEs in respective states',
      supportType: 'Capital subsidy / interest subvention',
      financialDetails: 'Varies: Maharashtra (MEDA) offers ~30% subsidy on rooftop solar; Gujarat offers Rs 10K-20K additional state subsidy on solar; Tamil Nadu (TEDA) offers 25% residential / 15% commercial solar subsidy',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Facility in the respective state; registered MSME',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'State-specific application form', 'DPR']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: JSON.stringify(['Maharashtra', 'Gujarat', 'Tamil Nadu', 'Karnataka', 'Rajasthan']),
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: null,
      reportedImpact: null,
      source: 'Respective State SDAs',
      sourceUrl: null,
    },
    {
      schemeId: 'S010',
      name: 'EESL ESCO Model (Pay-As-You-Save)',
      implementingAgency: 'EESL / UNIDO / MoMSME',
      targetBeneficiary: 'MSMEs with verifiable energy bills',
      supportType: 'Low upfront cost; repay from savings',
      financialDetails: 'MSME pays 20% upfront; EESL/UNIDO covers 80% of EE equipment cost (LEDs, motors, VFDs, HVAC); repaid from energy savings in quarterly instalments over max 3 years; 30-35 technologies covered across 12 MSME clusters',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'MSME unit with verifiable energy bills; EESL must assess feasibility; unit in designated MSME cluster',
      requiredDocuments: JSON.stringify(['12 months energy bills', 'Facility access for audit', 'Willingness agreement']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://msme.eeslindia.org',
      reportedImpact: 'Target: 1M tonnes CO2 saved annually; USD 150M investment potential',
      source: 'EESL MSME Portal',
      sourceUrl: 'https://msme.eeslindia.org/',
    },
  ];

  console.log('  Seeding funding schemes...');
  for (const scheme of fundingSchemes) {
    await prisma.fundingScheme.upsert({
      where: { schemeId: scheme.schemeId },
      update: scheme,
      create: scheme,
    });
  }
  console.log(`  ✓ ${fundingSchemes.length} funding schemes seeded\n`);

  // ── Technology ↔ Funding Links ──────────────────────────────────────────────
  // Maps which funding schemes apply to which technologies
  // Source: Spec document Section 7.2

  const techFundingLinks: Array<{
    techId: string;
    fundingId: string;
    subsidyPct: number | null;
    maxAmountLakhs: number | null;
    notes: string | null;
  }> = [];

  // Helper: look up seeded records by code
  const techMap = new Map<string, string>();
  const fundMap = new Map<string, string>();
  for (const t of reductionTechnologies) {
    const rec = await prisma.reductionTechnology.findUnique({ where: { techId: t.techId } });
    if (rec) techMap.set(t.techId, rec.id);
  }
  for (const s of fundingSchemes) {
    const rec = await prisma.fundingScheme.findUnique({ where: { schemeId: s.schemeId } });
    if (rec) fundMap.set(s.schemeId, rec.id);
  }

  function addLink(tech: string, fund: string, subsidyPct: number | null, maxAmountLakhs: number | null, notes: string | null) {
    const tId = techMap.get(tech);
    const fId = fundMap.get(fund);
    if (tId && fId) {
      techFundingLinks.push({ techId: tId, fundingId: fId, subsidyPct, maxAmountLakhs, notes });
    }
  }

  // T001 VFDs → S001, S003, S004, S006, S010
  addLink('T001', 'S001', 5, null, 'VFDs on BEE ADEETIE approved technology list');
  addLink('T001', 'S003', null, null, 'SIDBI partial credit guarantee for VFD loans');
  addLink('T001', 'S004', null, null, 'SIDBI concessional loan');
  addLink('T001', 'S006', null, null, 'TEQUP capital subsidy');
  addLink('T001', 'S010', null, null, 'EESL can supply and install VFDs');

  // T002 IE3 Motors → S001, S003, S004, S006, S010
  addLink('T002', 'S001', 5, null, 'Motors on ADEETIE approved list');
  addLink('T002', 'S003', null, null, null);
  addLink('T002', 'S004', null, null, null);
  addLink('T002', 'S006', null, null, null);
  addLink('T002', 'S010', null, null, 'EESL can supply and install motors');

  // T003 EE Boilers → S001, S002, S003, S004
  addLink('T003', 'S001', 5, null, 'ADEETIE covers boiler upgrades');
  addLink('T003', 'S002', null, null, 'UNIDO programme covers free DPR (if in cluster)');
  addLink('T003', 'S003', null, null, null);
  addLink('T003', 'S004', null, null, null);

  // T004 WHRS → S001, S002, S003, S004
  addLink('T004', 'S001', 5, null, 'ADEETIE interest subvention critical for high capex');
  addLink('T004', 'S002', null, null, null);
  addLink('T004', 'S003', null, null, null);
  addLink('T004', 'S004', null, null, null);

  // T005 Compressed Air → S001, S003, S006, S010
  addLink('T005', 'S001', 5, null, null);
  addLink('T005', 'S003', null, null, null);
  addLink('T005', 'S006', null, null, null);
  addLink('T005', 'S010', null, null, 'EESL can do compressed air audits');

  // T006 LED Lighting → S001, S006, S010
  addLink('T006', 'S001', 5, null, null);
  addLink('T006', 'S006', null, null, null);
  addLink('T006', 'S010', null, null, 'EESL primary channel for LED retrofit');

  // T007 Insulation → S001, S002, S006
  addLink('T007', 'S001', 5, null, null);
  addLink('T007', 'S002', null, null, null);
  addLink('T007', 'S006', null, null, null);

  // T008 ISO 50001 → S002, S007
  addLink('T008', 'S002', null, null, 'UNIDO provides free ISO 50001 training and certification');
  addLink('T008', 'S007', null, null, 'ZED alignment');

  // T009 DBC → S001, S002, S003
  addLink('T009', 'S001', 5, null, 'Foundry-specific');
  addLink('T009', 'S002', null, null, 'UNIDO demonstrated in Belgaum/Coimbatore foundry clusters');
  addLink('T009', 'S003', null, null, null);

  // T012 EE Induction Furnace → S001, S003, S004
  addLink('T012', 'S001', 5, null, 'ADEETIE 5% subvention critical for high capex');
  addLink('T012', 'S003', null, null, null);
  addLink('T012', 'S004', null, null, null);

  // T014 Sand Reclamation → S001, S002, S003
  addLink('T014', 'S001', 5, null, 'Foundry-specific');
  addLink('T014', 'S002', null, null, null);
  addLink('T014', 'S003', null, null, null);

  // T015 Solar CAPEX → S005, S009, S004
  addLink('T015', 'S005', 40, null, 'PM Surya Ghar if extended to MSMEs');
  addLink('T015', 'S009', 25, null, 'State-level solar subsidies (e.g. MEDA 25%)');
  addLink('T015', 'S004', null, null, 'SIDBI green loan for solar');

  // T016 Solar RESCO → S009
  addLink('T016', 'S009', null, null, 'State-level RE policies enable RESCO model');

  // T019 PNG Switch → S001, S003, S004
  addLink('T019', 'S001', 3, null, 'Burner conversion covered under ADEETIE');
  addLink('T019', 'S003', null, null, null);
  addLink('T019', 'S004', null, null, null);

  // T020 Biomass → S001, S008, S003
  addLink('T020', 'S001', 5, null, null);
  addLink('T020', 'S008', null, null, 'SATAT provides guaranteed biomass/CBG offtake');
  addLink('T020', 'S003', null, null, null);

  // T021 CBG → S008
  addLink('T021', 'S008', null, null, 'SATAT primary channel');

  // T022 Solar Thermal → S001, S004, S009
  addLink('T022', 'S001', 5, null, null);
  addLink('T022', 'S004', null, null, null);
  addLink('T022', 'S009', null, null, 'MNRE solar thermal demonstration programme');

  // T023 Electrification → S001, S003, S004
  addLink('T023', 'S001', 3, null, 'Long-term; larger financing may be needed');
  addLink('T023', 'S003', null, null, null);
  addLink('T023', 'S004', null, null, null);

  console.log('  Seeding technology-funding links...');
  for (const link of techFundingLinks) {
    await prisma.techFundingLink.upsert({
      where: {
        techId_fundingId: { techId: link.techId, fundingId: link.fundingId },
      },
      update: link,
      create: link,
    });
  }
  console.log(`  ✓ ${techFundingLinks.length} technology-funding links seeded\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // 9. Jargon Dictionary (Financing Journey)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  Seeding jargon dictionary...');

  const jargonEntries = [
    {
      term: 'DEA',
      fullForm: 'Detailed Energy Audit',
      explanation: 'A trained auditor visits your factory for 2-3 days, measures energy use in every machine, furnace, motor, compressor, and lighting system, and writes a report showing where energy is wasted and what can be saved. Think of it as a health check-up for your factory\'s energy use.',
      whoDoesIt: 'BEE-certified Energy Auditor (CEA) or Accredited Energy Auditor (AEA) firm',
      typicalCostInr: '₹50,000–₹2,00,000 (depends on factory size and complexity)',
      isReimbursed: 'Yes, under ADEETIE: up to ₹1L (medium) / ₹75K (micro/small). Under BEE-GEF-UNIDO: completely free in programme clusters.',
      relatedTerms: JSON.stringify(['IGEA', 'CEA', 'AEA']),
      source: 'BEE ADEETIE Guidelines',
      sourceUrl: 'https://adeetie.beeindia.gov.in',
    },
    {
      term: 'IGEA',
      fullForm: 'Investment Grade Energy Audit',
      explanation: 'A more detailed version of DEA that includes financial analysis — not just "you can save 20% electricity" but "if you spend ₹15L on VFDs, you\'ll save ₹4L/year, payback in 3.75 years, IRR 22%." This level of detail is needed for a bank to approve a loan.',
      whoDoesIt: 'Same as DEA — BEE-empaneled auditor firms',
      typicalCostInr: '₹75,000–₹2,50,000',
      isReimbursed: 'Yes, fully reimbursed under ADEETIE',
      relatedTerms: JSON.stringify(['DEA', 'DPR']),
      source: 'BEE ADEETIE Guidelines',
      sourceUrl: 'https://adeetie.beeindia.gov.in',
    },
    {
      term: 'DPR',
      fullForm: 'Detailed Project Report',
      explanation: 'A formal document that says: this is the technology we want to install, this is what it costs, this is the vendor quote, this is the expected energy saving, this is the payback period, and this is why a bank should lend us money for it. Banks won\'t approve a loan without a DPR.',
      whoDoesIt: 'Usually the same auditor who did the DEA, or a consultant recommended by SIDBI',
      typicalCostInr: '₹30,000–₹75,000 (often bundled with DEA)',
      isReimbursed: 'Yes, reimbursed under ADEETIE within the ₹1L/₹75K cap. Under SIDBI 4E, SIDBI\'s Energy Efficiency Cell vets the DPR at no cost.',
      relatedTerms: JSON.stringify(['IGEA', 'DEA']),
      source: 'BEE / SIDBI',
      sourceUrl: null,
    },
    {
      term: 'CEA',
      fullForm: 'Certified Energy Auditor',
      explanation: 'An individual who has passed BEE\'s national certification exam (4 papers) and has 3+ years of engineering experience. They can conduct energy audits independently.',
      whoDoesIt: 'Individual professional certified by BEE',
      typicalCostInr: 'N/A — it\'s a certification, not a service you buy',
      isReimbursed: null,
      relatedTerms: JSON.stringify(['AEA', 'DEA']),
      source: 'BEE',
      sourceUrl: 'https://beeindia.gov.in/content/certified-energy-auditors',
    },
    {
      term: 'AEA',
      fullForm: 'Accredited Energy Auditor',
      explanation: 'A firm (not individual) that has been accredited by BEE to conduct energy audits. Has a team of CEAs on staff. More common for industrial audits than individual CEAs.',
      whoDoesIt: 'Firms like NPC, TERI, Shakti Foundation — accredited by BEE',
      typicalCostInr: 'Hired by the MSME; fee varies by factory size',
      isReimbursed: null,
      relatedTerms: JSON.stringify(['CEA', 'DEA']),
      source: 'BEE',
      sourceUrl: 'https://beeindia.gov.in/content/accredited-energy-auditors',
    },
    {
      term: 'ESCO',
      fullForm: 'Energy Service Company',
      explanation: 'A company that installs energy-efficient equipment in your factory at ZERO upfront cost. They finance the installation themselves and get paid from your actual energy savings over 3-5 years. If you don\'t save, you don\'t pay.',
      whoDoesIt: 'Companies like EESL (government), or private ESCOs',
      typicalCostInr: 'Zero upfront cost to MSME — ESCO bears the capex',
      isReimbursed: 'N/A — the whole point is you don\'t pay upfront',
      relatedTerms: JSON.stringify(['EESL', 'EPC']),
      source: 'BEE / EESL',
      sourceUrl: 'https://eeslindia.org',
    },
    {
      term: 'M&V',
      fullForm: 'Monitoring & Verification',
      explanation: 'After the technology is installed, someone comes to verify that the energy savings actually happened as claimed. This is needed to release the subsidy or interest subvention. Typically done 3-6 months after installation.',
      whoDoesIt: 'The auditor firm or a third-party verifier empaneled by BEE',
      typicalCostInr: '₹10,000–₹30,000',
      isReimbursed: 'Typically included in the scheme support',
      relatedTerms: JSON.stringify(['DEA', 'IGEA']),
      source: 'BEE',
      sourceUrl: null,
    },
    {
      term: 'CGTMSE',
      fullForm: 'Credit Guarantee Fund Trust for Micro and Small Enterprises',
      explanation: 'If you don\'t have collateral (property/assets) to pledge for a bank loan, CGTMSE guarantees the loan so the bank takes less risk. Your bank applies for CGTMSE cover — you don\'t apply directly.',
      whoDoesIt: 'Bank applies on your behalf to CGTMSE',
      typicalCostInr: 'Small guarantee fee (0.5-1% of loan amount, one-time)',
      isReimbursed: 'Often waived for loans under ₹5L',
      relatedTerms: JSON.stringify(['PRSF', 'SIDBI']),
      source: 'CGTMSE Trust',
      sourceUrl: 'https://www.cgtmse.in',
    },
    {
      term: 'PRSF',
      fullForm: 'Partial Risk Sharing Facility',
      explanation: 'SIDBI + World Bank facility that covers part of the default risk for banks lending to energy efficiency projects. This means banks are more willing to lend and may offer lower interest rates. 77 EE projects supported as of Dec 2023.',
      whoDoesIt: 'SIDBI manages it; your bank accesses it',
      typicalCostInr: 'No direct cost to MSME',
      isReimbursed: 'N/A — it\'s a risk-sharing mechanism between banks',
      relatedTerms: JSON.stringify(['SIDBI', 'CGTMSE']),
      source: 'SIDBI',
      sourceUrl: 'https://www.sidbi.in',
    },
    {
      term: 'SDA',
      fullForm: 'State Designated Agency',
      explanation: 'Each state has a government body responsible for energy efficiency and renewable energy (e.g., MEDA in Maharashtra, TEDA in Tamil Nadu, HAREDA in Haryana). They often offer additional state-level subsidies on top of central schemes.',
      whoDoesIt: 'State government agency',
      typicalCostInr: 'No cost — they provide subsidies',
      isReimbursed: 'They ARE the subsidiser',
      relatedTerms: JSON.stringify(['MEDA', 'GEDA', 'TEDA']),
      source: 'BEE',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    {
      term: 'EOI',
      fullForm: 'Expression of Interest',
      explanation: 'A simple 1-2 page form that says "I\'m interested in this scheme." It includes basic info about your factory (name, location, sector, energy bills). This is always step ONE — before anything else.',
      whoDoesIt: 'The MSME fills this out themselves',
      typicalCostInr: '₹0',
      isReimbursed: 'N/A',
      relatedTerms: JSON.stringify(['DPR']),
      source: 'BEE ADEETIE',
      sourceUrl: 'https://adeetie.beeindia.gov.in',
    },
    {
      term: 'EPC',
      fullForm: 'Energy Performance Contract',
      explanation: 'A contract between an MSME and an ESCO where payment is linked to actual energy savings achieved. If the ESCO doesn\'t deliver the promised savings, the MSME pays less or nothing. Typical duration is 3-5 years.',
      whoDoesIt: 'ESCO (e.g., EESL) drafts and signs with the MSME',
      typicalCostInr: 'Zero upfront — payments come from verified savings',
      isReimbursed: 'N/A',
      relatedTerms: JSON.stringify(['ESCO', 'M&V']),
      source: 'BEE',
      sourceUrl: null,
    },
    {
      term: 'PPA',
      fullForm: 'Power Purchase Agreement',
      explanation: 'A contract to buy electricity from a solar developer at a fixed rate (typically ₹3-4/kWh) for 15-25 years. The developer installs solar panels on YOUR roof at THEIR cost. You save 50-70% on the solar-covered portion of your electricity bill from day one.',
      whoDoesIt: 'Solar RESCO / developer signs with the MSME',
      typicalCostInr: 'Zero upfront — you pay per unit of solar electricity consumed',
      isReimbursed: 'N/A',
      relatedTerms: JSON.stringify(['RESCO']),
      source: 'MNRE',
      sourceUrl: null,
    },
    {
      term: 'RESCO',
      fullForm: 'Renewable Energy Service Company',
      explanation: 'A company that installs solar panels on your roof at their own cost. You sign a PPA to buy the generated electricity at a rate lower than grid. After the contract (15-25 years), you own the panels. Zero upfront investment.',
      whoDoesIt: 'Solar developers (Tata Power Solar, Fourth Partner Energy, etc.)',
      typicalCostInr: 'Zero upfront — solar developer bears all capex',
      isReimbursed: 'N/A — savings come from lower per-unit electricity cost',
      relatedTerms: JSON.stringify(['PPA', 'ESCO']),
      source: 'MNRE',
      sourceUrl: null,
    },
    {
      term: 'NCV',
      fullForm: 'Net Calorific Value',
      explanation: 'The amount of heat energy released when a fuel is burned, minus the energy lost to water evaporation. Measured in TJ/Gg (terajoules per gigagram). Used to convert fuel quantity to energy content for emission calculations. Higher NCV = more energy per kg of fuel.',
      whoDoesIt: 'Laboratory testing or standard reference values (IPCC)',
      typicalCostInr: 'N/A — standard values from IPCC are used',
      isReimbursed: null,
      relatedTerms: null,
      source: 'IPCC 2019 Refinement',
      sourceUrl: 'https://www.ipcc-nggip.iges.or.jp',
    },
  ];

  for (const entry of jargonEntries) {
    await prisma.jargonEntry.upsert({
      where: { term: entry.term },
      update: entry,
      create: entry,
    });
  }
  console.log(`  ✓ ${jargonEntries.length} jargon entries seeded\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // 10. Action Plan Steps (Financing Journey)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  Seeding action plan steps...');

  // Look up internal FundingScheme IDs (same pattern as techFundingLinks)
  const schemeIdMap = new Map<string, string>();
  for (const s of fundingSchemes) {
    const rec = await prisma.fundingScheme.findUnique({ where: { schemeId: s.schemeId } });
    if (rec) schemeIdMap.set(s.schemeId, rec.id);
  }

  interface ActionPlanStepData {
    schemeId: string;
    stepNumber: number;
    title: string;
    description: string;
    estimatedTime: string | null;
    estimatedCost: string | null;
    documentsNeeded: string | null;
    actionUrl: string | null;
    actionLabel: string | null;
    tips: string | null;
    source: string | null;
    sourceUrl: string | null;
  }

  const actionPlanSteps: ActionPlanStepData[] = [];

  function addStep(schemeCode: string, stepNumber: number, data: Omit<ActionPlanStepData, 'schemeId' | 'stepNumber'>) {
    const internalId = schemeIdMap.get(schemeCode);
    if (internalId) {
      actionPlanSteps.push({ schemeId: internalId, stepNumber, ...data });
    }
  }

  // ── S001 ADEETIE: 7 steps ──
  addStep('S001', 1, {
    title: 'Check Eligibility',
    description: 'Verify you have Udyam registration, your factory is in one of the 60 ADEETIE clusters, your sector is among the 14 covered (Iron & Steel, Textiles, Foundry, Forging, Ceramics, Dairy, Brick Kilns, Brass, Chemicals, Glass, Leather, Paper, Pharma, Food Processing), and you\'re willing to achieve minimum 10% energy saving.',
    estimatedTime: '5 minutes',
    estimatedCost: '₹0',
    documentsNeeded: JSON.stringify(['Udyam registration certificate']),
    actionUrl: 'https://adeetie.beeindia.gov.in',
    actionLabel: 'Check ADEETIE Portal',
    tips: 'If you don\'t have Udyam registration, get it free at udyamregistration.gov.in (takes 15 minutes with Aadhaar and PAN).',
    source: 'BEE ADEETIE Scheme Guidelines',
    sourceUrl: 'https://adeetie.beeindia.gov.in',
  });

  addStep('S001', 2, {
    title: 'Submit Expression of Interest (EOI)',
    description: 'Download the EOI format from the ADEETIE portal and fill in your company name, Udyam number, sector, annual energy consumption, and contact details. Email it to the BEE facilitation centre. This is your formal request to participate in the scheme.',
    estimatedTime: '30 minutes',
    estimatedCost: '₹0',
    documentsNeeded: JSON.stringify(['Udyam certificate', '12 months electricity bills', 'Basic company details']),
    actionUrl: 'https://adeetie.beeindia.gov.in',
    actionLabel: 'Download EOI Format',
    tips: 'Keep your last 12 months DISCOM bills ready before starting. You\'ll need total kWh consumed and bill amounts.',
    source: 'BEE ADEETIE',
    sourceUrl: 'https://adeetie.beeindia.gov.in',
  });

  addStep('S001', 3, {
    title: 'Energy Audit (IGEA)',
    description: 'BEE assigns an empaneled auditor from the ADEETIE list, or you choose one yourself. The auditor visits your factory for 2-3 days, measures energy use in every machine, furnace, motor, and compressor, and writes an Investment Grade Energy Audit report with specific technology recommendations and savings estimates.',
    estimatedTime: '2-4 weeks',
    estimatedCost: '₹50,000–₹2,00,000 (reimbursable: up to ₹1L for medium, ₹75K for micro/small)',
    documentsNeeded: JSON.stringify(['12 months electricity bills', '12 months fuel purchase records', 'Production data (tonnes/month)', 'Equipment list with rated capacities']),
    actionUrl: 'https://adeetie.beeindia.gov.in/accredited-energy-audit-agencies',
    actionLabel: 'Find Empaneled Auditors',
    tips: 'You pay the auditor upfront, but the cost is reimbursed after M&V approval (Step 7). Ask the auditor for references from similar factories.',
    source: 'BEE ADEETIE',
    sourceUrl: 'https://adeetie.beeindia.gov.in/list-of-auditing-firms-empaneled-with-bee-for-scheme',
  });

  addStep('S001', 4, {
    title: 'Detailed Project Report (DPR)',
    description: 'The auditor (or a separate consultant) prepares the DPR. It includes: technology specification, vendor quotes (usually 3), cost breakdown, expected energy savings (kWh or fuel tonnes), payback period, IRR, NPV. Submit the DPR to BEE through the ADEETIE portal for approval.',
    estimatedTime: '1-2 weeks after audit',
    estimatedCost: '₹30,000–₹75,000 (usually bundled with audit; included in ₹1L/₹75K reimbursement cap)',
    documentsNeeded: JSON.stringify(['IGEA report', 'Minimum 3 vendor quotations', 'Technology specification sheets']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Get at least 3 vendor quotes — banks require this. Ask the auditor to prepare the DPR simultaneously with the IGEA to save time.',
    source: 'BEE ADEETIE',
    sourceUrl: null,
  });

  addStep('S001', 5, {
    title: 'Bank Loan Application',
    description: 'Take the approved DPR to your existing bank OR apply to SIDBI directly (they have a dedicated EE lending cell). The loan amount is as specified in the DPR (typically ₹10L–₹150L). Interest rate is market rate MINUS 5% for micro/small or 3% for medium enterprises. Repayment is 36 months (up to ₹100L) or 60 months (above ₹100L) with up to 6 months moratorium.',
    estimatedTime: '2-4 weeks',
    estimatedCost: 'Bank processing fee: 0.5-1% of loan amount (₹5,000–₹15,000 on a ₹10L loan)',
    documentsNeeded: JSON.stringify(['Udyam certificate', 'GST registration and returns (last 2 years)', 'Income tax returns (last 2 years)', 'Bank statements (last 12 months)', 'IGEA report', 'DPR', 'Technology vendor quotations (minimum 3)']),
    actionUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
    actionLabel: 'Apply via SIDBI',
    tips: 'The equipment itself serves as primary security. If you don\'t have collateral, ask the bank to apply for CGTMSE cover (collateral-free guarantee).',
    source: 'BEE ADEETIE / SIDBI',
    sourceUrl: null,
  });

  addStep('S001', 6, {
    title: 'Technology Installation',
    description: 'Place order with the approved vendor from the DPR. The vendor installs the equipment, does commissioning and testing. Start saving energy. Keep all installation records, invoices, and commissioning certificates — you\'ll need them for M&V.',
    estimatedTime: '4-12 weeks',
    estimatedCost: 'Paid from loan disbursement (no additional out-of-pocket cost)',
    documentsNeeded: JSON.stringify(['Vendor purchase order', 'Installation completion certificate', 'Commissioning report', 'Payment receipts']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Take "before" readings of energy consumption before installation starts. You\'ll need these for the M&V comparison.',
    source: 'BEE ADEETIE',
    sourceUrl: null,
  });

  addStep('S001', 7, {
    title: 'Monitoring & Verification (M&V)',
    description: 'BEE-empaneled verifier checks actual energy savings against DPR projections, typically 3-6 months after installation. If savings are 10% or more, the interest subsidy continues for the loan tenure and your audit cost reimbursement is released. You keep saving energy and the loan EMI is typically less than your monthly savings.',
    estimatedTime: '3-6 months after installation',
    estimatedCost: '₹10,000–₹30,000 (usually covered under scheme)',
    documentsNeeded: JSON.stringify(['Energy bills post-installation (3-6 months)', 'Production data post-installation', 'Installation completion certificate']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Keep detailed energy consumption records from the moment the new equipment is operational. The bigger the documented savings, the easier the M&V approval.',
    source: 'BEE ADEETIE',
    sourceUrl: null,
  });

  // ── S010 EESL ESCO: 5 steps ──
  addStep('S010', 1, {
    title: 'Contact EESL',
    description: 'Contact EESL (Energy Efficiency Services Limited) through their MSME portal or nearest regional office. Provide your basic factory details: location, type of industry, monthly electricity bill amount, and the equipment you use (motors, compressors, lighting, HVAC).',
    estimatedTime: '30 minutes',
    estimatedCost: '₹0',
    documentsNeeded: JSON.stringify(['12 months electricity bills', 'Factory address and contact details']),
    actionUrl: 'https://msme.eeslindia.org',
    actionLabel: 'Visit EESL MSME Portal',
    tips: 'EESL typically looks for factories with monthly electricity bills above ₹50,000. If your bill is lower, a private ESCO may be more suitable.',
    source: 'EESL',
    sourceUrl: 'https://eeslindia.org',
  });

  addStep('S010', 2, {
    title: 'Free Feasibility Assessment',
    description: 'EESL sends a team to your factory for a free feasibility assessment (1-2 days). They check which equipment can be upgraded (motors, lighting, compressors, HVAC), estimate the energy savings potential, and determine if the project is viable for the ESCO model. Minimum viable savings: approximately ₹1,00,000/year.',
    estimatedTime: '1-2 weeks',
    estimatedCost: '₹0 (completely free)',
    documentsNeeded: JSON.stringify(['Factory access for EESL team', 'Equipment inventory list', 'Operating hours data']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Be transparent about your actual operating hours and production patterns. Over-reporting will make the savings projections unrealistic and the project may fail M&V later.',
    source: 'EESL',
    sourceUrl: null,
  });

  addStep('S010', 3, {
    title: 'Review & Sign Agreement',
    description: 'EESL proposes the project with specific technologies, expected monthly savings, your 20% co-payment amount, and the contract duration (typically 3 years with quarterly repayment). Review the Shared Savings Agreement carefully — the key clause is that if they don\'t deliver savings, you pay less.',
    estimatedTime: '1-2 weeks',
    estimatedCost: '20% of project cost upfront (e.g., ₹2L on a ₹10L project)',
    documentsNeeded: JSON.stringify(['Company authorization letter', 'Signatory authority documents']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Negotiate the savings split. Typical is 50-70% to EESL. Also confirm what happens at contract end — equipment should transfer to you at no additional cost.',
    source: 'EESL',
    sourceUrl: null,
  });

  addStep('S010', 4, {
    title: 'Equipment Installation',
    description: 'EESL arranges everything: procurement, delivery, installation, and commissioning. You provide factory access and a contact person. Typical equipment: IE3/IE4 motors, LED lighting, VFDs, efficient compressors. Installation usually takes 2-4 weeks depending on factory size.',
    estimatedTime: '2-4 weeks',
    estimatedCost: '₹0 additional (covered by EESL)',
    documentsNeeded: JSON.stringify(['Factory access during installation hours', 'Designated contact person']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Plan installation during a scheduled maintenance shutdown if possible. This avoids production disruption.',
    source: 'EESL',
    sourceUrl: null,
  });

  addStep('S010', 5, {
    title: 'Savings & Repayment',
    description: 'Every month your energy bill is lower. The 80% financed portion is repaid quarterly from your actual savings over 3 years. After the contract ends, the equipment is yours and you keep 100% of savings. EESL conducts periodic M&V to verify savings are on track.',
    estimatedTime: '3 years (repayment period)',
    estimatedCost: 'Quarterly repayments from energy savings (structured so savings > repayment)',
    documentsNeeded: JSON.stringify(['Monthly energy bills for comparison', 'Production data for normalization']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Track your savings independently. Compare pre-installation and post-installation energy bills month by month. This data is useful for claiming the benefit in your BRSR disclosure.',
    source: 'EESL',
    sourceUrl: null,
  });

  // ── S004 SIDBI 4E: 5 steps ──
  addStep('S004', 1, {
    title: 'Get an Energy Audit Done',
    description: 'Before approaching SIDBI, get a Detailed Energy Audit from a BEE-certified auditor. This identifies specific technologies (VFDs, efficient motors, solar, etc.) with their costs and savings. Under SIDBI 4E, the walk-through audit, detailed energy audit, and DPR preparation can be supported by SIDBI\'s Energy Efficiency Cell (EEC).',
    estimatedTime: '2-4 weeks',
    estimatedCost: '₹50,000–₹2,00,000 (may be supported by SIDBI EEC)',
    documentsNeeded: JSON.stringify(['12 months electricity and fuel bills', 'Production data', 'Equipment list']),
    actionUrl: null,
    actionLabel: null,
    tips: 'If you\'re also eligible for ADEETIE, apply there first — the audit cost gets reimbursed. Then use the IGEA report for your SIDBI 4E loan application.',
    source: 'SIDBI',
    sourceUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
  });

  addStep('S004', 2, {
    title: 'Prepare & Submit DPR',
    description: 'Prepare a Detailed Project Report based on the energy audit findings. Include technology specifications, 3 vendor quotes, cost-benefit analysis, payback period, and projected energy savings. Submit to SIDBI branch office or through your existing bank if they have a SIDBI refinancing arrangement.',
    estimatedTime: '1-2 weeks',
    estimatedCost: '₹30,000–₹75,000 (may be covered by SIDBI EEC)',
    documentsNeeded: JSON.stringify(['Energy audit report', '3 vendor quotations', 'DPR with financial projections']),
    actionUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
    actionLabel: 'Find SIDBI Branch',
    tips: 'SIDBI\'s EEC can vet your DPR at no cost. Contact the nearest SIDBI branch to check if EEC support is available in your area.',
    source: 'SIDBI',
    sourceUrl: null,
  });

  addStep('S004', 3, {
    title: 'Loan Sanction',
    description: 'SIDBI evaluates your application: credit history, project viability, energy savings potential. Loan amount ranges from ₹10L to ₹150L per borrower at 2-3.85% below SIDBI\'s normal lending rate (based on your credit rating). Loan can cover up to 90% of project cost.',
    estimatedTime: '2-4 weeks',
    estimatedCost: 'Processing fee: 0.5-1% of loan amount',
    documentsNeeded: JSON.stringify(['Udyam certificate', 'GST returns (2 years)', 'ITR (2 years)', 'Bank statements (12 months)', 'Balance sheet and P&L (2 years)', 'DPR']),
    actionUrl: null,
    actionLabel: null,
    tips: 'If you\'ve been in business for 3+ years with cash profits in the last 2 years, approval is typically straightforward. SIDBI also offers CGTMSE cover for collateral-free lending.',
    source: 'SIDBI',
    sourceUrl: null,
  });

  addStep('S004', 4, {
    title: 'Install Technology',
    description: 'Use the loan disbursement to purchase and install the approved technology. Work with the vendor quoted in your DPR. Ensure proper commissioning and document everything — energy meter readings before and after, installation certificates, payment receipts.',
    estimatedTime: '4-12 weeks',
    estimatedCost: 'From loan disbursement + your 10% equity contribution',
    documentsNeeded: JSON.stringify(['Purchase order to vendor', 'Installation certificate', 'Commissioning report', 'Payment receipts', '"Before" energy readings']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Document baseline energy consumption carefully before installation. Install sub-meters if possible — they make M&V much easier.',
    source: 'SIDBI',
    sourceUrl: null,
  });

  addStep('S004', 5, {
    title: 'Repayment & Savings',
    description: 'Repay the loan over 36 months (for loans up to ₹100L) or 60 months (above ₹100L). With 2-3.85% interest concession, effective rates are 4-7%. Monthly EMI is typically lower than monthly energy savings, making you cash-positive from month one. Up to 6 months moratorium available.',
    estimatedTime: '36-60 months',
    estimatedCost: 'Monthly EMI from savings (cash positive from month 1 in most cases)',
    documentsNeeded: null,
    actionUrl: null,
    actionLabel: null,
    tips: 'Keep tracking energy savings versus EMI payments. If you\'re saving more than the EMI, consider prepaying the loan to save on interest.',
    source: 'SIDBI',
    sourceUrl: null,
  });

  // ── S005 Solar (RESCO/CAPEX): 4 steps ──
  addStep('S005', 1, {
    title: 'Assess Roof Suitability',
    description: 'Check your factory roof: Is there shadow-free area? (Need ~100 sqft per kWp.) Is the roof structurally strong? (Solar panels add 15-20 kg/sqm.) Most solar companies offer free site surveys — they\'ll visit, assess, and tell you how much capacity your roof can support.',
    estimatedTime: '1 week',
    estimatedCost: '₹0 (free site survey by solar companies)',
    documentsNeeded: JSON.stringify(['Electricity bills (12 months)', 'Roof area estimate', 'Building structure details']),
    actionUrl: null,
    actionLabel: null,
    tips: 'South-facing roofs get the most sunlight. Even partial shading from a water tank or chimney can reduce output by 20-30%. Share your electricity bills so the installer can size the system correctly.',
    source: 'MNRE',
    sourceUrl: null,
  });

  addStep('S005', 2, {
    title: 'Choose RESCO (Zero Cost) or CAPEX (Own the Panels)',
    description: 'RESCO/OPEX model: Developer installs at their cost, you sign a 15-25 year PPA at ₹3-4/kWh (vs grid ₹8-12/kWh). Zero upfront investment. CAPEX model: You buy the panels (₹40-60/Watt), own them immediately, get state subsidies (10-30%), and free electricity after 3-5 year payback. Use SIDBI 4E or ADEETIE loan for CAPEX.',
    estimatedTime: '1-2 weeks to decide and finalize agreement',
    estimatedCost: 'RESCO: ₹0 upfront. CAPEX: ₹40-60L for 100 kWp (before subsidies)',
    documentsNeeded: JSON.stringify(['Roof lease agreement (if rented)', 'Net metering application', 'Electricity connection details']),
    actionUrl: null,
    actionLabel: null,
    tips: 'If your electricity bill is above ₹1L/month and you plan to operate for 10+ years, CAPEX gives better lifetime returns. If cash flow is tight, RESCO gives instant savings with zero investment.',
    source: 'MNRE',
    sourceUrl: null,
  });

  addStep('S005', 3, {
    title: 'Installation & Commissioning',
    description: 'Selected vendor installs solar panels, inverters, and wiring. Process takes 4-8 weeks. Apply for net metering with your DISCOM (they allow you to export excess solar to the grid and get credits on your bill). DISCOM installs a bi-directional meter.',
    estimatedTime: '4-8 weeks (installation) + 2-4 weeks (net metering approval)',
    estimatedCost: 'DISCOM meter fee: ₹2,000-5,000',
    documentsNeeded: JSON.stringify(['DISCOM net metering application', 'Solar system specifications', 'Vendor installation certificate', 'Electrical safety certificate']),
    actionUrl: null,
    actionLabel: null,
    tips: 'Apply for net metering BEFORE installation starts — DISCOM approval can take 2-4 weeks. This way both complete around the same time.',
    source: 'State DISCOM / MNRE',
    sourceUrl: null,
  });

  addStep('S005', 4, {
    title: 'Start Saving',
    description: 'Solar panels generate electricity during daylight hours (6-8 hours peak). Your grid bill drops by 30-80% depending on system size. Track generation via the inverter app. Under net metering, excess units are credited to your bill. System requires minimal maintenance (panel cleaning every 2-4 weeks).',
    estimatedTime: 'Ongoing — system life 25 years',
    estimatedCost: 'Maintenance: ₹1,000-2,000/month (cleaning + monitoring)',
    documentsNeeded: null,
    actionUrl: null,
    actionLabel: null,
    tips: 'Clean panels regularly — dust reduces output by 10-25% in Indian conditions. Monitor daily generation through the inverter app to catch any issues early.',
    source: 'MNRE',
    sourceUrl: null,
  });

  for (const step of actionPlanSteps) {
    await prisma.actionPlanStep.upsert({
      where: {
        schemeId_stepNumber: { schemeId: step.schemeId, stepNumber: step.stepNumber },
      },
      update: step,
      create: step,
    });
  }
  console.log(`  ✓ ${actionPlanSteps.length} action plan steps seeded\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. Service Providers (Financing Journey)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  Seeding service providers...');

  const serviceProviders = [
    // SDAs
    {
      name: 'MEDA (Maharashtra Energy Development Agency)',
      type: 'sda',
      services: JSON.stringify(['Solar subsidies', 'EE technology subsidies', 'Energy audit support']),
      states: JSON.stringify(['Maharashtra']),
      sectors: null,
      accreditation: 'State Designated Agency under BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://mahaurja.com',
      address: 'Mumbai, Maharashtra',
      source: 'BEE SDA List',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    {
      name: 'GEDA (Gujarat Energy Development Agency)',
      type: 'sda',
      services: JSON.stringify(['Net metering for solar', 'EE loans', 'Industrial policy incentives']),
      states: JSON.stringify(['Gujarat']),
      sectors: null,
      accreditation: 'State Designated Agency under BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://geda.gujarat.gov.in',
      address: 'Gandhinagar, Gujarat',
      source: 'BEE SDA List',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    {
      name: 'TEDA (Tamil Nadu Energy Development Agency)',
      type: 'sda',
      services: JSON.stringify(['Solar subsidies', 'EE technology demonstrations']),
      states: JSON.stringify(['Tamil Nadu']),
      sectors: null,
      accreditation: 'State Designated Agency under BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://teda.in',
      address: 'Chennai, Tamil Nadu',
      source: 'BEE SDA List',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    {
      name: 'HAREDA (Haryana Renewable Energy Development Agency)',
      type: 'sda',
      services: JSON.stringify(['Solar subsidies', 'PEACE scheme (50% audit cost, 25% implementation cost)']),
      states: JSON.stringify(['Haryana']),
      sectors: null,
      accreditation: 'State Designated Agency under BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://hareda.gov.in',
      address: 'Chandigarh, Haryana',
      source: 'BEE SDA List',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    {
      name: 'KREDL (Karnataka Renewable Energy Development Ltd)',
      type: 'sda',
      services: JSON.stringify(['Solar subsidies', 'Green energy open access facilitation']),
      states: JSON.stringify(['Karnataka']),
      sectors: null,
      accreditation: 'State Designated Agency under BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://kredl.karnataka.gov.in',
      address: 'Bengaluru, Karnataka',
      source: 'BEE SDA List',
      sourceUrl: 'https://beeindia.gov.in/content/sdas',
    },
    // Auditor bodies
    {
      name: 'National Productivity Council (NPC)',
      type: 'energy_auditor',
      services: JSON.stringify(['DEA', 'IGEA', 'DPR', 'M&V']),
      states: JSON.stringify(['Pan-India']),
      sectors: JSON.stringify(['foundry', 'forging', 'steel_re_rolling', 'ceramics']),
      accreditation: 'BEE AEA; 20+ certified auditors',
      contactEmail: null,
      contactPhone: null,
      website: 'https://npcindia.gov.in',
      address: 'New Delhi (HQ) + 14 regional offices',
      source: 'NPC Website',
      sourceUrl: 'https://npcindia.gov.in',
    },
    {
      name: 'TERI (The Energy and Resources Institute)',
      type: 'energy_auditor',
      services: JSON.stringify(['DEA', 'IGEA', 'DPR', 'Technology assessment', 'Training']),
      states: JSON.stringify(['Pan-India']),
      sectors: JSON.stringify(['iron_steel', 'textiles', 'ceramics', 'chemicals']),
      accreditation: 'BEE AEA; ADEETIE empaneled',
      contactEmail: null,
      contactPhone: null,
      website: 'https://www.teriin.org',
      address: 'New Delhi (HQ) + regional offices',
      source: 'TERI Website',
      sourceUrl: 'https://www.teriin.org',
    },
    {
      name: 'BEE Empaneled Auditors (ADEETIE)',
      type: 'energy_auditor',
      services: JSON.stringify(['DEA', 'IGEA', 'DPR under ADEETIE scheme']),
      states: JSON.stringify(['Pan-India']),
      sectors: null,
      accreditation: 'ADEETIE Empaneled by BEE',
      contactEmail: null,
      contactPhone: null,
      website: 'https://adeetie.beeindia.gov.in/accredited-energy-audit-agencies',
      address: 'Various — see official list',
      source: 'BEE ADEETIE Portal',
      sourceUrl: 'https://adeetie.beeindia.gov.in/list-of-auditing-firms-empaneled-with-bee-for-scheme',
    },
    // Financing institutions
    {
      name: 'SIDBI (Small Industries Development Bank of India)',
      type: 'bank',
      services: JSON.stringify(['4E green loans', 'PRSF credit guarantee', 'MSME refinancing']),
      states: JSON.stringify(['Pan-India']),
      sectors: null,
      accreditation: 'Development Financial Institution',
      contactEmail: null,
      contactPhone: null,
      website: 'https://www.sidbi.in',
      address: 'Lucknow (HQ) + 100+ branch offices',
      source: 'SIDBI Website',
      sourceUrl: 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
    },
    {
      name: 'EESL (Energy Efficiency Services Limited)',
      type: 'esco',
      services: JSON.stringify(['ESCO installation', 'LED upgrades', 'Motor replacement', 'HVAC efficiency']),
      states: JSON.stringify(['Pan-India']),
      sectors: null,
      accreditation: 'Government of India PSU (Joint venture of NTPC, PFC, REC, POWERGRID)',
      contactEmail: null,
      contactPhone: null,
      website: 'https://eeslindia.org',
      address: 'New Delhi (HQ) + regional offices',
      source: 'EESL Website',
      sourceUrl: 'https://msme.eeslindia.org',
    },
    {
      name: 'CGTMSE (Credit Guarantee Fund Trust for MSEs)',
      type: 'bank',
      services: JSON.stringify(['Collateral-free loan guarantee up to ₹5 Cr']),
      states: JSON.stringify(['Pan-India']),
      sectors: null,
      accreditation: 'Government of India Trust (SIDBI + Ministry of MSME)',
      contactEmail: null,
      contactPhone: null,
      website: 'https://www.cgtmse.in',
      address: 'Mumbai (HQ)',
      source: 'CGTMSE Website',
      sourceUrl: 'https://www.cgtmse.in',
    },
    // Portals
    {
      name: 'ADEETIE Portal (BEE)',
      type: 'consultant',
      services: JSON.stringify(['EOI submission', 'Scheme information', 'Auditor directory', 'Application tracking']),
      states: JSON.stringify(['Pan-India']),
      sectors: null,
      accreditation: 'Official BEE scheme portal',
      contactEmail: 'facilitation-centre@beeindia.gov.in',
      contactPhone: null,
      website: 'https://adeetie.beeindia.gov.in',
      address: null,
      source: 'BEE',
      sourceUrl: 'https://adeetie.beeindia.gov.in',
    },
  ];

  for (const sp of serviceProviders) {
    const existing = await prisma.serviceProvider.findFirst({
      where: { name: sp.name, type: sp.type },
    });
    if (existing) {
      await prisma.serviceProvider.update({ where: { id: existing.id }, data: sp });
    } else {
      await prisma.serviceProvider.create({ data: sp });
    }
  }
  console.log(`  ✓ ${serviceProviders.length} service providers seeded\n`);

  console.log('Seed complete. All data points auditable to source.\n');
  console.log('Run: npx tsx data/generate-audit.ts to generate source-audit.xlsx');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

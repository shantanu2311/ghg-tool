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
  // Sources: Worldsteel Association, BEE PAT Scheme, IEA Iron & Steel Roadmap

  const benchmarks = [
    {
      sector: 'iron_steel',
      subSector: 'eaf_mini_mill',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.4,
      sectorAverage: 0.45,
      worstQuartile: 0.55,
      source: 'Worldsteel Association / IEA Iron & Steel Technology Roadmap 2020',
      sourceUrl: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
      year: 2020,
    },
    {
      sector: 'iron_steel',
      subSector: 'induction_furnace',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.6,
      sectorAverage: 0.75,
      worstQuartile: 0.9,
      source: 'BEE PAT Scheme / Worldsteel data for Indian MSME sector',
      sourceUrl: 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade',
      year: 2022,
    },
    {
      sector: 'iron_steel',
      subSector: 're_rolling',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.15,
      sectorAverage: 0.28,
      worstQuartile: 0.40,
      source: 'BEE PAT Scheme / Indian steel MSME data',
      sourceUrl: 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade',
      year: 2022,
    },
    {
      sector: 'iron_steel',
      subSector: 'forging',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.3,
      sectorAverage: 0.45,
      worstQuartile: 0.6,
      source: 'BEE PAT Scheme / Industry estimates',
      sourceUrl: 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade',
      year: 2022,
    },
    {
      sector: 'iron_steel',
      subSector: 'casting_foundry',
      metric: 'tCO2e_per_tonne',
      bestPractice: 0.5,
      sectorAverage: 0.65,
      worstQuartile: 0.8,
      source: 'BEE PAT Scheme / Industry estimates',
      sourceUrl: 'https://beeindia.gov.in/en/programmes/perform-achieve-and-trade',
      year: 2022,
    },
    // EAF electricity-specific benchmark
    {
      sector: 'iron_steel',
      subSector: 'eaf_mini_mill',
      metric: 'kWh_per_tonne',
      bestPractice: 400,
      sectorAverage: 550,
      worstQuartile: 700,
      source: 'Worldsteel Association / IEA Iron & Steel Technology Roadmap 2020',
      sourceUrl: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
      year: 2020,
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
      sourceUrl: 'https://sameeeksha.org/',
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
      source: 'TERI-SSEF IE3 Motor Project',
      sourceUrl: 'https://www.teriin.org/',
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
      source: 'SAMEEEKSHA/Shakti Foundation',
      sourceUrl: 'https://sameeeksha.org/',
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
      source: 'SAMEEEKSHA; avg 26% saving',
      sourceUrl: 'https://sameeeksha.org/',
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
      sourceUrl: 'https://beeindia.gov.in/',
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
      sourceUrl: 'https://beeindia.gov.in/',
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
      sourceUrl: 'https://beeindia.gov.in/',
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
      sourceUrl: 'https://sidhiee.beeindia.gov.in/',
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
      source: 'UNIDO-BEE Tech Compendium',
      sourceUrl: 'https://www.unido.org/',
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
      source: 'CPCB/NITI Aayog',
      sourceUrl: 'https://cpcb.nic.in/',
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
      source: 'Power Line Magazine',
      sourceUrl: null,
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
      source: 'BEE-GEF-UNIDO',
      sourceUrl: 'https://sidhiee.beeindia.gov.in/',
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
      source: 'BEE-GEF-UNIDO DPRs',
      sourceUrl: 'https://sidhiee.beeindia.gov.in/',
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
      source: 'UNIDO Tech Compendium Indore',
      sourceUrl: 'https://www.unido.org/',
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
      sourceUrl: 'https://www.niti.gov.in/',
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
      source: 'NITI Aayog MSME Roadmap',
      sourceUrl: 'https://www.niti.gov.in/',
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
      source: 'NITI Aayog; CERC/SERC',
      sourceUrl: 'https://www.niti.gov.in/',
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
      source: 'NITI Aayog (medium-term)',
      sourceUrl: 'https://www.niti.gov.in/',
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
      source: 'NITI Aayog; PNGRB',
      sourceUrl: 'https://www.pngrb.gov.in/',
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
      source: 'MNRE-GIZ Report',
      sourceUrl: 'https://mnre.gov.in/',
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
      source: 'SATAT Scheme',
      sourceUrl: 'https://satat.co.in/',
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
      source: 'MNRE; CSTEP',
      sourceUrl: 'https://mnre.gov.in/',
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
      source: 'Ember India; NITI Aayog',
      sourceUrl: 'https://ember-climate.org/',
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
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns', 'ceramics', 'dairy']),
      eligibilityCriteria: 'Udyam registered; EE technology with proven 10%+ energy saving; in ADEETIE-eligible cluster',
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
      sourceUrl: 'https://beeindia.gov.in/',
    },
    {
      schemeId: 'S002',
      name: 'BEE-GEF-UNIDO Programme',
      implementingAgency: 'BEE + UNIDO + GEF',
      targetBeneficiary: 'MSMEs in designated programme clusters',
      supportType: 'Free energy audit + DPR + tech demo',
      financialDetails: 'GEF grant-funded; zero cost to MSME for audits and DPRs',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'ceramics', 'dairy', 'brass']),
      eligibilityCriteria: 'MSME in designated programme cluster (26 clusters: foundry, ceramics, dairy, brass, hand tools)',
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
      sourceUrl: 'https://sidhiee.beeindia.gov.in/',
    },
    {
      schemeId: 'S003',
      name: 'SIDBI PRSF (Partial Risk Sharing Facility)',
      implementingAgency: 'SIDBI + World Bank',
      targetBeneficiary: 'MSMEs with bankable EE projects',
      supportType: 'Partial credit guarantee for bank loans',
      financialDetails: 'Covers default risk for banks lending to EE projects; reduces interest rate by 1-2%',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'MSME with identified EE project; bankable DPR prepared; minimum loan Rs 10L',
      requiredDocuments: JSON.stringify(['DPR', 'Bank loan application', 'Energy audit report', 'Udyam certificate']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://prsf.sidbi.in',
      reportedImpact: null,
      source: 'SIDBI PRSF',
      sourceUrl: 'https://sidbi.in/',
    },
    {
      schemeId: 'S004',
      name: 'SIDBI 4E / Green Finance',
      implementingAgency: 'SIDBI',
      targetBeneficiary: 'Udyam-registered MSMEs',
      supportType: 'Concessional loans for EE/RE',
      financialDetails: 'Lower interest rates (1-2% below market) for EE and RE projects in MSMEs',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Udyam registered; project must demonstrate measurable energy saving',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'DPR', 'Quotation']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://sidbi.in',
      reportedImpact: null,
      source: 'SIDBI Green Finance',
      sourceUrl: 'https://sidbi.in/',
    },
    {
      schemeId: 'S005',
      name: 'PM Surya Ghar (proposed MSME extension)',
      implementingAgency: 'MNRE',
      targetBeneficiary: 'Micro enterprises (proposed extension)',
      supportType: 'Capital subsidy for rooftop solar',
      financialDetails: 'Currently residential only; NITI Aayog proposes extending to micro-enterprises with 40% subsidy on first 3 kW, 20% on next 7 kW',
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
      name: 'TEQUP (Technology Upgradation Support)',
      implementingAgency: 'MoMSME (DC-MSME)',
      targetBeneficiary: 'Registered MSMEs',
      supportType: 'Capital subsidy for technology',
      financialDetails: 'Subsidy for acquiring EE technologies and product certifications',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Registered MSME; technology must be for quality/EE improvement',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'Technology supplier invoice', 'Application form']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://msme.gov.in',
      reportedImpact: null,
      source: 'MoMSME TEQUP',
      sourceUrl: 'https://msme.gov.in/',
    },
    {
      schemeId: 'S007',
      name: 'ZED Certification Incentive',
      implementingAgency: 'MoMSME / QCI',
      targetBeneficiary: 'Udyam-registered MSMEs',
      supportType: 'Certification + linked subsidies',
      financialDetails: 'ZED-certified MSMEs get priority access to other govt subsidies; solar adoption improves ZED score',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Udyam registered; willing to undergo ZED assessment',
      requiredDocuments: JSON.stringify(['Udyam certificate', 'ZED application']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
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
      financialDetails: 'SATAT: guaranteed offtake for CBG at Rs 54/kg; VGF for biomass boiler conversion',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'Biomass fuel producer or MSME consumer switching to biomass',
      requiredDocuments: JSON.stringify(['Project proposal', 'Biomass supply agreement', 'Environmental clearance if required']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://mnre.gov.in',
      reportedImpact: 'SATAT targets 5,000 CBG plants by 2030',
      source: 'MNRE / SATAT Scheme',
      sourceUrl: 'https://satat.co.in/',
    },
    {
      schemeId: 'S009',
      name: 'State-level EE Subsidies',
      implementingAgency: 'State Designated Agencies (SDAs)',
      targetBeneficiary: 'MSMEs in respective states',
      supportType: 'Capital subsidy / interest subvention',
      financialDetails: 'Varies: Maharashtra (MEDA) offers 25% subsidy on solar; Gujarat offers concessional loans for EE; Tamil Nadu offers subsidies via TEDA',
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
      implementingAgency: 'EESL',
      targetBeneficiary: 'MSMEs with verifiable energy bills',
      supportType: 'Zero upfront cost; repay from savings',
      financialDetails: 'EESL installs EE equipment (LEDs, motors, HVAC) at zero cost; MSME pays from energy savings over 3-5 years',
      sectorsCovered: JSON.stringify(['iron_steel', 'textiles', 'brick_kilns']),
      eligibilityCriteria: 'MSME unit with verifiable energy bills; EESL must assess feasibility',
      requiredDocuments: JSON.stringify(['12 months energy bills', 'Facility access for audit', 'Willingness agreement']),
      minEnergySaving: null,
      turnoverBrackets: JSON.stringify(['micro', 'small', 'medium']),
      applicableStates: null,
      status: 'Active',
      validFrom: null,
      validTo: null,
      applicationUrl: 'https://eeslindia.org',
      reportedImpact: null,
      source: 'EESL',
      sourceUrl: 'https://eeslindia.org/',
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

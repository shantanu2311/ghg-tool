// ── Test Fixtures ───────────────────────────────────────────────────────────
// Shared reference data that mirrors the seed database.
// Every value is from verified IPCC/CEA/DEFRA sources.

import type {
  FuelPropertyData,
  EmissionFactorData,
  GwpSet,
  UnitConversionData,
} from '@/lib/calc-engine/types';

// ── GWP Sets ────────────────────────────────────────────────────────────────

export const GWP_AR5: GwpSet = {
  report: 'AR5',
  CO2: 1,
  CH4: 28,
  N2O: 265,
  SF6: 23500,
  R22: 1760,
  HFC134A: 1300,
};

export const GWP_AR6: GwpSet = {
  report: 'AR6',
  CO2: 1,
  CH4: 28,
  N2O: 273,
  SF6: 23500,
  R22: 1760,
  HFC134A: 1300,
};

// ── Fuel Properties ─────────────────────────────────────────────────────────

export const FUEL_PROPERTIES: FuelPropertyData[] = [
  {
    code: 'DIESEL_HSD', name: 'Diesel / HSD', category: 'liquid_fuel', baseUnit: 'kL',
    density: 0.832, ncvTjPerGg: 43.0, co2EfKgPerTj: 74100, defaultPriceInr: 90,
    alternateUnits: [{ unit: 'litre', factor: 0.001, toUnit: 'kL' }],
  },
  {
    code: 'PETROL_MS', name: 'Petrol / MS', category: 'liquid_fuel', baseUnit: 'kL',
    density: 0.745, ncvTjPerGg: 44.3, co2EfKgPerTj: 69300, defaultPriceInr: 105,
    alternateUnits: [{ unit: 'litre', factor: 0.001, toUnit: 'kL' }],
  },
  {
    code: 'LPG', name: 'LPG', category: 'gaseous_fuel', baseUnit: 'tonne',
    density: 0.54, ncvTjPerGg: 47.3, co2EfKgPerTj: 63100, defaultPriceInr: 1100,
    alternateUnits: [
      { unit: 'kg', factor: 0.001, toUnit: 'tonne' },
      { unit: 'cylinder_domestic', factor: 0.0142, toUnit: 'tonne' },
      { unit: 'cylinder_commercial', factor: 0.019, toUnit: 'tonne' },
    ],
  },
  {
    code: 'NATURAL_GAS', name: 'Natural Gas', category: 'gaseous_fuel', baseUnit: 'thousand_m3',
    density: 0.74, ncvTjPerGg: 48.0, co2EfKgPerTj: 56100, defaultPriceInr: null,
    alternateUnits: [{ unit: 'm3', factor: 0.001, toUnit: 'thousand_m3' }, { unit: 'SCM', factor: 0.001, toUnit: 'thousand_m3' }],
  },
  {
    code: 'COAL_INDIAN', name: 'Indian Coal', category: 'solid_fuel', baseUnit: 'tonne',
    density: null, ncvTjPerGg: 18.9, co2EfKgPerTj: 96100, defaultPriceInr: 6000,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }, { unit: 'bag_50kg', factor: 0.05, toUnit: 'tonne' }],
  },
  {
    code: 'COKING_COAL', name: 'Coking Coal', category: 'solid_fuel', baseUnit: 'tonne',
    density: null, ncvTjPerGg: 28.2, co2EfKgPerTj: 94600, defaultPriceInr: 15000,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'COKE', name: 'Coke', category: 'solid_fuel', baseUnit: 'tonne',
    density: null, ncvTjPerGg: 28.2, co2EfKgPerTj: 107000, defaultPriceInr: 25000,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'FURNACE_OIL', name: 'Furnace Oil', category: 'liquid_fuel', baseUnit: 'kL',
    density: 0.95, ncvTjPerGg: 40.4, co2EfKgPerTj: 77400, defaultPriceInr: 55,
    alternateUnits: [{ unit: 'litre', factor: 0.001, toUnit: 'kL' }],
  },
  {
    code: 'BIOMASS_WOOD', name: 'Biomass / Wood', category: 'biomass', baseUnit: 'tonne',
    density: null, ncvTjPerGg: 15.6, co2EfKgPerTj: 112000, defaultPriceInr: 3000,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'GRID_ELECTRICITY', name: 'Grid Electricity', category: 'electricity', baseUnit: 'kWh',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: 8,
    alternateUnits: [
      { unit: 'unit', factor: 1, toUnit: 'kWh' },
      { unit: 'lakh_unit', factor: 100000, toUnit: 'kWh' },
      { unit: 'MWh', factor: 1000, toUnit: 'kWh' },
    ],
  },
  {
    code: 'RENEWABLE_ELECTRICITY', name: 'Renewable Electricity', category: 'electricity', baseUnit: 'kWh',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'MWh', factor: 1000, toUnit: 'kWh' }],
  },
  {
    code: 'R22_HCFC22', name: 'R-22 / HCFC-22', category: 'refrigerant', baseUnit: 'kg',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [],
  },
  {
    code: 'HFC134A', name: 'HFC-134a', category: 'refrigerant', baseUnit: 'kg',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [],
  },
  {
    code: 'SF6', name: 'SF6', category: 'refrigerant', baseUnit: 'kg',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [],
  },
  {
    code: 'GRAPHITE_ELECTRODE', name: 'Graphite Electrode', category: 'material', baseUnit: 'kg',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'tonne', factor: 1000, toUnit: 'kg' }],
  },
  {
    code: 'LIMESTONE', name: 'Limestone', category: 'material', baseUnit: 'tonne',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'DOLOMITE', name: 'Dolomite', category: 'material', baseUnit: 'tonne',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  // Scope 3 materials
  {
    code: 'SCRAP_STEEL', name: 'Steel Scrap', category: 'material', baseUnit: 'tonne',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'IRON_ORE', name: 'Iron Ore', category: 'material', baseUnit: 'tonne',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
  {
    code: 'FERROALLOY', name: 'Ferroalloy', category: 'material', baseUnit: 'tonne',
    density: null, ncvTjPerGg: null, co2EfKgPerTj: null, defaultPriceInr: null,
    alternateUnits: [{ unit: 'kg', factor: 0.001, toUnit: 'tonne' }],
  },
];

// ── Emission Factors ────────────────────────────────────────────────────────

export const EMISSION_FACTORS: EmissionFactorData[] = [
  // Scope 1 — Stationary Combustion (IPCC 2019 Refinement, Vol 2, Table 2.3 Manufacturing)
  { id: 'ef-diesel-s1', fuelOrActivity: 'DIESEL_HSD', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 74100, ch4Ef: 3, n2oEf: 0.6, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-petrol-s1', fuelOrActivity: 'PETROL_MS', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 69300, ch4Ef: 3, n2oEf: 0.6, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-lpg-s1', fuelOrActivity: 'LPG', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 63100, ch4Ef: 1, n2oEf: 0.1, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-ng-s1', fuelOrActivity: 'NATURAL_GAS', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 56100, ch4Ef: 1, n2oEf: 0.1, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-coal-s1', fuelOrActivity: 'COAL_INDIAN', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 96100, ch4Ef: 1, n2oEf: 1.5, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-coking-s1', fuelOrActivity: 'COKING_COAL', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 94600, ch4Ef: 1, n2oEf: 1.5, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-coke-s1', fuelOrActivity: 'COKE', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 107000, ch4Ef: 1, n2oEf: 1.5, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-fo-s1', fuelOrActivity: 'FURNACE_OIL', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 77400, ch4Ef: 3, n2oEf: 0.6, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  { id: 'ef-biomass-s1', fuelOrActivity: 'BIOMASS_WOOD', scope: 1, scopeCategory: 'stationary_combustion', co2Ef: 112000, ch4Ef: 30, n2oEf: 4, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 2.3' },
  // Scope 1 — Mobile Combustion (IPCC 2019 Refinement, Vol 2, Table 3.2.2)
  { id: 'ef-diesel-mob', fuelOrActivity: 'DIESEL_HSD', scope: 1, scopeCategory: 'mobile_combustion', co2Ef: 74100, ch4Ef: 3.9, n2oEf: 3.9, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 3.2.2' },
  { id: 'ef-petrol-mob', fuelOrActivity: 'PETROL_MS', scope: 1, scopeCategory: 'mobile_combustion', co2Ef: 69300, ch4Ef: 33, n2oEf: 3.2, efUnit: 'TJ', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 2 Table 3.2.2' },
  // Scope 1 — Process
  { id: 'ef-eaf-proc', fuelOrActivity: 'EAF_PROCESS', scope: 1, scopeCategory: 'process', co2Ef: 80, ch4Ef: null, n2oEf: null, efUnit: 'tonne_steel', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 3 Ch 4' },
  { id: 'ef-graphite', fuelOrActivity: 'GRAPHITE_ELECTRODE', scope: 1, scopeCategory: 'process', co2Ef: 3.667, ch4Ef: null, n2oEf: null, efUnit: 'kg', region: null, source: 'Stoichiometric', sourceVersion: 'C → CO2 (12→44)' },
  { id: 'ef-limestone', fuelOrActivity: 'LIMESTONE', scope: 1, scopeCategory: 'process', co2Ef: 440, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 3 Ch 2' },
  { id: 'ef-dolomite', fuelOrActivity: 'DOLOMITE', scope: 1, scopeCategory: 'process', co2Ef: 477, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'IPCC 2019 Refinement', sourceVersion: 'Vol 3 Ch 2' },
  // Scope 1 — Fugitive
  { id: 'ef-r22', fuelOrActivity: 'R22_HCFC22', scope: 1, scopeCategory: 'fugitive', co2Ef: 1760, ch4Ef: null, n2oEf: null, efUnit: 'kg', region: null, source: 'IPCC AR5', sourceVersion: 'GWP 100yr' },
  { id: 'ef-hfc134a', fuelOrActivity: 'HFC134A', scope: 1, scopeCategory: 'fugitive', co2Ef: 1300, ch4Ef: null, n2oEf: null, efUnit: 'kg', region: null, source: 'IPCC AR5', sourceVersion: 'GWP 100yr' },
  { id: 'ef-sf6', fuelOrActivity: 'SF6', scope: 1, scopeCategory: 'fugitive', co2Ef: 23500, ch4Ef: null, n2oEf: null, efUnit: 'kg', region: null, source: 'IPCC AR5', sourceVersion: 'GWP 100yr' },
  // Scope 2 — Grid Electricity (CEA v21.0)
  { id: 'ef-grid', fuelOrActivity: 'GRID_ELECTRICITY', scope: 2, scopeCategory: 'grid_electricity', co2Ef: 0.710, ch4Ef: null, n2oEf: null, efUnit: 'kWh', region: null, source: 'CEA CO2 Baseline Database', sourceVersion: 'v21.0 FY2024-25' },
  // Scope 3 — Purchased Goods (DEFRA 2024)
  { id: 'ef-scrap', fuelOrActivity: 'SCRAP_STEEL', scope: 3, scopeCategory: 'purchased_goods', co2Ef: 430, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Scope 3 lifecycle' },
  { id: 'ef-ironore', fuelOrActivity: 'IRON_ORE', scope: 3, scopeCategory: 'purchased_goods', co2Ef: 40, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Scope 3 lifecycle' },
  { id: 'ef-ferro', fuelOrActivity: 'FERROALLOY', scope: 3, scopeCategory: 'purchased_goods', co2Ef: 5000, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Scope 3 lifecycle' },
  // Scope 3 — Transport (DEFRA 2024)
  { id: 'ef-road', fuelOrActivity: 'ROAD_FREIGHT', scope: 3, scopeCategory: 'upstream_transport', co2Ef: 0.10726, ch4Ef: null, n2oEf: null, efUnit: 'tonne-km', region: null, source: 'DEFRA 2024', sourceVersion: 'Freight' },
  { id: 'ef-rail', fuelOrActivity: 'RAIL_FREIGHT', scope: 3, scopeCategory: 'upstream_transport', co2Ef: 0.02455, ch4Ef: null, n2oEf: null, efUnit: 'tonne-km', region: null, source: 'DEFRA 2024', sourceVersion: 'Freight' },
  // Scope 3 — Waste (DEFRA 2024)
  { id: 'ef-landfill', fuelOrActivity: 'WASTE_LANDFILL', scope: 3, scopeCategory: 'waste', co2Ef: 586, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Waste disposal' },
  { id: 'ef-recycle', fuelOrActivity: 'WASTE_RECYCLED', scope: 3, scopeCategory: 'waste', co2Ef: 21, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Waste recycling' },
  { id: 'ef-slag', fuelOrActivity: 'SLAG_REUSE', scope: 3, scopeCategory: 'waste', co2Ef: 5, ch4Ef: null, n2oEf: null, efUnit: 'tonne', region: null, source: 'DEFRA 2024', sourceVersion: 'Waste reuse' },
  // Scope 3 — Business Travel (DEFRA 2024)
  { id: 'ef-car', fuelOrActivity: 'TRAVEL_CAR', scope: 3, scopeCategory: 'business_travel', co2Ef: 0.17148, ch4Ef: null, n2oEf: null, efUnit: 'km', region: null, source: 'DEFRA 2024', sourceVersion: 'Business travel' },
  { id: 'ef-train', fuelOrActivity: 'TRAVEL_RAIL', scope: 3, scopeCategory: 'business_travel', co2Ef: 0.03549, ch4Ef: null, n2oEf: null, efUnit: 'km', region: null, source: 'DEFRA 2024', sourceVersion: 'Business travel' },
  { id: 'ef-air', fuelOrActivity: 'TRAVEL_AIR_DOMESTIC', scope: 3, scopeCategory: 'business_travel', co2Ef: 0.24587, ch4Ef: null, n2oEf: null, efUnit: 'km', region: null, source: 'DEFRA 2024', sourceVersion: 'Business travel' },
];

// ── Unit Conversions ────────────────────────────────────────────────────────

export const UNIT_CONVERSIONS: UnitConversionData[] = [
  // Volume
  { fromUnit: 'litre', toUnit: 'kL', factor: 0.001, fuelCode: null },
  { fromUnit: 'kL', toUnit: 'litre', factor: 1000, fuelCode: null },
  // Mass
  { fromUnit: 'kg', toUnit: 'tonne', factor: 0.001, fuelCode: null },
  { fromUnit: 'tonne', toUnit: 'kg', factor: 1000, fuelCode: null },
  // Energy
  { fromUnit: 'MWh', toUnit: 'kWh', factor: 1000, fuelCode: null },
  { fromUnit: 'kWh', toUnit: 'MWh', factor: 0.001, fuelCode: null },
  { fromUnit: 'GJ', toUnit: 'TJ', factor: 0.001, fuelCode: null },
  { fromUnit: 'TJ', toUnit: 'GJ', factor: 1000, fuelCode: null },
  { fromUnit: 'kWh', toUnit: 'GJ', factor: 0.0036, fuelCode: null },
  // Indian units
  { fromUnit: 'lakh_unit', toUnit: 'kWh', factor: 100000, fuelCode: null },
  { fromUnit: 'bag_50kg', toUnit: 'tonne', factor: 0.05, fuelCode: null },
  { fromUnit: 'cylinder_domestic', toUnit: 'tonne', factor: 0.0142, fuelCode: null },
  { fromUnit: 'cylinder_commercial', toUnit: 'tonne', factor: 0.019, fuelCode: null },
  // Fuel-specific density conversions
  { fromUnit: 'litre', toUnit: 'kg', factor: 0.832, fuelCode: 'DIESEL_HSD' },
  { fromUnit: 'litre', toUnit: 'kg', factor: 0.745, fuelCode: 'PETROL_MS' },
  { fromUnit: 'litre', toUnit: 'kg', factor: 0.54, fuelCode: 'LPG' },
  { fromUnit: 'litre', toUnit: 'kg', factor: 0.95, fuelCode: 'FURNACE_OIL' },
];

// ── Helper: generate activity IDs ───────────────────────────────────────────

let _idCounter = 0;
export function genId(prefix = 'act'): string {
  return `${prefix}-${++_idCounter}-${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  _idCounter = 0;
}

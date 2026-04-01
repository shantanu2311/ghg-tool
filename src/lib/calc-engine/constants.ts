// ── GHG Engine Constants ────────────────────────────────────────────────────

import type { GridRegion, GwpSet } from './types';

// ── Indian States → CEA Grid Region Mapping ─────────────────────────────────
// Source: Central Electricity Authority regional grid classification

export const STATE_GRID_MAP: Record<string, GridRegion> = {
  'Chandigarh': 'NORTHERN', 'Delhi': 'NORTHERN', 'Haryana': 'NORTHERN',
  'Himachal Pradesh': 'NORTHERN', 'Jammu and Kashmir': 'NORTHERN',
  'Ladakh': 'NORTHERN', 'Punjab': 'NORTHERN', 'Rajasthan': 'NORTHERN',
  'Uttar Pradesh': 'NORTHERN', 'Uttarakhand': 'NORTHERN',
  'Chhattisgarh': 'WESTERN', 'Daman and Diu': 'WESTERN',
  'Dadra and Nagar Haveli': 'WESTERN', 'Goa': 'WESTERN',
  'Gujarat': 'WESTERN', 'Madhya Pradesh': 'WESTERN', 'Maharashtra': 'WESTERN',
  'Andhra Pradesh': 'SOUTHERN', 'Karnataka': 'SOUTHERN',
  'Kerala': 'SOUTHERN', 'Lakshadweep': 'SOUTHERN',
  'Puducherry': 'SOUTHERN', 'Tamil Nadu': 'SOUTHERN', 'Telangana': 'SOUTHERN',
  'Bihar': 'EASTERN', 'Jharkhand': 'EASTERN', 'Odisha': 'EASTERN',
  'West Bengal': 'EASTERN', 'Sikkim': 'EASTERN',
  'Arunachal Pradesh': 'NORTHEASTERN', 'Assam': 'NORTHEASTERN',
  'Manipur': 'NORTHEASTERN', 'Meghalaya': 'NORTHEASTERN',
  'Mizoram': 'NORTHEASTERN', 'Nagaland': 'NORTHEASTERN', 'Tripura': 'NORTHEASTERN',
};

export const INDIAN_STATES = Object.keys(STATE_GRID_MAP).sort();

// ── GWP Values ──────────────────────────────────────────────────────────────
// Source: IPCC AR5 WG1 Table 8.A.1 (100-year GWP)
// Hardcoded fallback for pure engine (no DB). DB seed has identical values for AR5 and AR6 options.

export const GWP_AR5: GwpSet = {
  report: 'AR5',
  CO2: 1,
  CH4: 28,     // IPCC AR5 WG1 Table 8.A.1
  N2O: 265,    // IPCC AR5 WG1 Table 8.A.1
};

export const GWP_AR6: GwpSet = {
  report: 'AR6',
  CO2: 1,
  CH4: 28,     // IPCC AR6 WG1 Table 7.15 (27.9, rounded)
  N2O: 273,    // IPCC AR6 WG1 Table 7.15
};

// ── Iron & Steel Sub-Sectors ────────────────────────────────────────────────

export const IRON_STEEL_SUB_SECTORS = [
  { value: 'eaf_mini_mill', label: 'EAF Mini Mill' },
  { value: 'induction_furnace', label: 'Induction Furnace' },
  { value: 're_rolling', label: 'Re-Rolling Mill' },
  { value: 'forging', label: 'Forging Unit' },
  { value: 'casting_foundry', label: 'Casting / Foundry' },
  { value: 'other', label: 'Other' },
] as const;

// ── Scope Categories ────────────────────────────────────────────────────────

export const SCOPE1_CATEGORIES = [
  { value: 'stationary_combustion', label: 'Stationary Combustion' },
  { value: 'mobile_combustion', label: 'Mobile Combustion' },
  { value: 'process', label: 'Process Emissions' },
  { value: 'fugitive', label: 'Fugitive Emissions' },
] as const;

export const SCOPE2_CATEGORIES = [
  { value: 'grid_electricity', label: 'Grid Electricity' },
  { value: 'purchased_steam', label: 'Purchased Steam/Heat' },
] as const;

export const SCOPE3_CATEGORIES = [
  { value: 'purchased_goods', label: 'Cat 1: Purchased Goods & Services' },
  { value: 'upstream_transport', label: 'Cat 4: Upstream Transportation' },
  { value: 'waste', label: 'Cat 5: Waste Generated in Operations' },
  { value: 'business_travel', label: 'Cat 6: Business Travel' },
  { value: 'downstream_transport', label: 'Cat 9: Downstream Transportation' },
] as const;

// ── Energy Conversion Constants ─────────────────────────────────────────────

export const KWH_TO_GJ = 0.0036;
export const TJ_TO_GJ = 1000;
export const MJ_TO_GJ = 0.001;

// ── Data Quality Weights ────────────────────────────────────────────────────

export const DATA_QUALITY_WEIGHTS: Record<string, number> = {
  PRIMARY: 3,
  SECONDARY: 2,
  ESTIMATED: 1,
};

// ── BRSR Principle 6 Field Mapping ──────────────────────────────────────────

export const BRSR_FIELDS = [
  { field: 'scope1Total', label: 'Total Scope 1 Emissions (tCO2e)', source: 'Sum of all Scope 1 calculated emissions' },
  { field: 'scope2Total', label: 'Total Scope 2 Emissions (tCO2e)', source: 'Electricity consumption × CEA grid EF' },
  { field: 'scope3Total', label: 'Total Scope 3 Emissions (tCO2e)', source: 'Sum of Category 1, 4, 5, 6, 9' },
  { field: 'biogenicCo2Total', label: 'Biogenic CO2 (tCO2) — Memo Item', source: 'Biomass combustion CO2, reported separately per GHG Protocol' },
  { field: 'intensityPerTurnover', label: 'Emission Intensity per Rupee of Turnover', source: 'Total emissions / annual turnover' },
  { field: 'intensityPerProduct', label: 'Emission Intensity per Unit of Product', source: 'Total emissions / total production quantity' },
  { field: 'energyConsumedGj', label: 'Total Energy Consumed (GJ)', source: 'Sum of all fuel energy content + electricity in GJ' },
  { field: 'renewablePercent', label: 'Energy from Renewable Sources (%)', source: 'Renewable electricity / total electricity' },
] as const;

// ── Turnover Brackets (MSME Act 2020) ───────────────────────────────────────

export const TURNOVER_BRACKETS = [
  { value: 'micro', label: 'Micro (up to Rs 5 Cr)' },
  { value: 'small', label: 'Small (Rs 5-50 Cr)' },
  { value: 'medium', label: 'Medium (Rs 50-250 Cr)' },
] as const;

// ── Indian Financial Year ───────────────────────────────────────────────────

export const INDIAN_FY_START_MONTH = 4; // April
export const INDIAN_FY_END_MONTH = 3;   // March

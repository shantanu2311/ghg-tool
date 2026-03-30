// ── GHG Calculation Engine Types ────────────────────────────────────────────

export type Scope = 1 | 2 | 3;
export type DataQuality = 'PRIMARY' | 'SECONDARY' | 'ESTIMATED';
export type InputMode = 'quantity' | 'spend';
export type ReportFormat = 'BRSR' | 'ISO' | 'DETAILED' | 'BENCHMARK';
export type PeriodStatus = 'draft' | 'calculated' | 'finalised';
export type GridRegion = 'NORTHERN' | 'SOUTHERN' | 'WESTERN' | 'EASTERN' | 'NORTHEASTERN';
export type GwpReport = 'AR5' | 'AR6';

// Iron & Steel sub-sectors per blueprint
export type IronSteelSubSector =
  | 'eaf_mini_mill'
  | 'induction_furnace'
  | 're_rolling'
  | 'forging'
  | 'casting_foundry'
  | 'other';

// ── Data Inputs ─────────────────────────────────────────────────────────────

export interface OrganisationInput {
  name: string;
  udyamNumber?: string;
  sector: string;
  subSector: string;
  state: string;
  district?: string;
  employeeCount?: number;
  turnoverBracket?: string;
}

export interface FacilityInput {
  id?: string;
  name: string;
  state: string;
  gridRegion: GridRegion;
  activityType: string;
}

export interface ActivityDataInput {
  id?: string;
  facilityId: string;
  scope: Scope;
  sourceCategory: string;
  fuelType: string;
  description?: string;
  inputMode: InputMode;
  quantity?: number;
  unit?: string;
  spendInr?: number;
  dataQualityFlag: DataQuality;
  month?: number;
}

// ── Reference Data ──────────────────────────────────────────────────────────

export interface FuelPropertyData {
  code: string;
  name: string;
  category: string;
  baseUnit: string;
  density: number | null;
  ncvTjPerGg: number | null;
  co2EfKgPerTj: number | null;
  defaultPriceInr: number | null;
  alternateUnits: AlternateUnit[];
}

export interface AlternateUnit {
  unit: string;
  factor: number;
  toUnit: string;
}

export interface EmissionFactorData {
  id: string;
  fuelOrActivity: string;
  scope: Scope;
  scopeCategory: string | null;
  co2Ef: number;
  ch4Ef: number | null;
  n2oEf: number | null;
  efUnit: string;
  region: string | null;
  source: string;
  sourceVersion: string | null;
}

export interface GwpSet {
  report: GwpReport;
  CO2: number;
  CH4: number;
  N2O: number;
  [gas: string]: number | string;
}

export interface UnitConversionData {
  fromUnit: string;
  toUnit: string;
  factor: number;
  fuelCode: string | null;
}

// ── Calculation Results ─────────────────────────────────────────────────────

export interface ConversionStep {
  from: { value: number; unit: string };
  to: { value: number; unit: string };
  method: string;
  factor: number;
}

export interface CalculationStep {
  step: number;
  description: string;
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  unit: string;
}

export interface EmissionBreakdown {
  co2Tonnes: number;
  ch4Co2eTonnes: number;
  n2oCo2eTonnes: number;
  totalCo2eTonnes: number;
  biogenicCo2Tonnes: number;
}

export interface CalculationRecord extends EmissionBreakdown {
  activityDataId: string;
  efId: string;
  efSource: string;
  efVersion: string | null;
  gwpReport: GwpReport;
  calculationSteps: CalculationStep[];
}

export interface CrossCheckWarning {
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  expectedRange?: { min: number; max: number; unit: string };
  actualValue?: number;
}

export interface DataQualityScore {
  overall: number; // 0-100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement';
  breakdown: {
    primary: number;
    secondary: number;
    estimated: number;
    total: number;
  };
  recommendations: string[];
}

export interface ScopeTotal {
  scope: Scope;
  total: number;
  categories: { category: string; total: number }[];
}

export interface IntensityMetrics {
  perTurnover: number | null;
  perProduct: number | null;
  perEmployee: number | null;
}

export interface InventoryResult {
  organisationId: string;
  periodId: string;
  scope1: ScopeTotal;
  scope2Location: ScopeTotal;
  scope2Market: ScopeTotal | null;
  scope3: ScopeTotal;
  grandTotal: number;
  biogenicCo2Total: number;
  energyConsumedGj: number;
  renewablePercent: number;
  intensityMetrics: IntensityMetrics;
  dataQuality: DataQualityScore;
  crossCheckWarnings: CrossCheckWarning[];
  calculations: CalculationRecord[];
  topSources: { source: string; co2e: number; percent: number }[];
  facilityBreakdown: { facilityId: string; facilityName: string; total: number }[];
  monthlyTrend: { month: number; total: number }[] | null;
  calculationErrors: { activityId: string; error: string }[];
}

// ── BRSR Output ─────────────────────────────────────────────────────────────

export interface BrsrOutput {
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  biogenicCo2Total: number;
  intensityPerTurnover: number | null;
  intensityPerProduct: number | null;
  totalEnergyGj: number;
  renewablePercent: number;
}

// ── Engine Input ────────────────────────────────────────────────────────────

export interface CalculationInput {
  organisationId: string;
  periodId: string;
  organisation: OrganisationInput;
  facilities: FacilityInput[];
  activityData: ActivityDataInput[];
  fuelProperties: FuelPropertyData[];
  emissionFactors: EmissionFactorData[];
  gwpSet: GwpSet;
  unitConversions: UnitConversionData[];
  productionTonnes?: number;
  annualTurnoverLakhInr?: number;
}

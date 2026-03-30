import { create } from 'zustand';
import type { Scope, DataQuality, InputMode } from './calc-engine/types';
import type { InventoryResult } from './calc-engine/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Organisation {
  name: string;
  udyamNumber: string;
  sector: string;
  subSector: string;
  state: string;
  district: string;
  employeeCount: number | null;
  turnoverBracket: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  state: string;
  district: string;
  gridRegion: string;
  activityType: string;
}

export interface Period {
  startDate: string;
  endDate: string;
  baseYearFlag: boolean;
}

export interface ActivityEntry {
  id: string;
  facilityId: string;
  sourceCategory: string;
  fuelType: string;
  description: string;
  inputMode: InputMode;
  quantity: number | null;
  unit: string;
  spendInr: number | null;
  dataQualityFlag: DataQuality;
  month: number | null;
}

// ── State ──────────────────────────────────────────────────────────────────

export interface WizardState {
  currentStep: number;

  // Step 1
  organisation: Organisation;
  // Step 2
  facilities: Facility[];
  // Step 3
  period: Period;
  // Step 4
  scope1Data: ActivityEntry[];
  // Step 5
  scope2Data: ActivityEntry[];
  // Step 6
  scope3Data: ActivityEntry[];

  // Calculation context
  productionTonnes: number | null;
  annualTurnoverLakhInr: number | null;
  calculationResult: InventoryResult | null;
  isCalculating: boolean;
  errors: string[];
}

// ── Actions ────────────────────────────────────────────────────────────────

export interface WizardActions {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  updateOrganisation: (data: Partial<Organisation>) => void;

  addFacility: (facility: Omit<Facility, 'id'>) => void;
  updateFacility: (id: string, data: Partial<Omit<Facility, 'id'>>) => void;
  removeFacility: (id: string) => void;

  updatePeriod: (data: Partial<Period>) => void;

  addActivity: (scope: Scope, entry: Omit<ActivityEntry, 'id'>) => void;
  updateActivity: (scope: Scope, id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  removeActivity: (scope: Scope, id: string) => void;

  setProductionTonnes: (value: number | null) => void;
  setAnnualTurnover: (value: number | null) => void;

  setCalculationResult: (result: InventoryResult | null) => void;
  setIsCalculating: (value: boolean) => void;
  setErrors: (errors: string[]) => void;

  reset: () => void;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const defaultOrganisation: Organisation = {
  name: '',
  udyamNumber: '',
  sector: 'iron_steel',
  subSector: '',
  state: '',
  district: '',
  employeeCount: null,
  turnoverBracket: '',
  contactEmail: '',
  contactPhone: '',
};

const defaultPeriod: Period = {
  startDate: '',
  endDate: '',
  baseYearFlag: false,
};

const initialState: WizardState = {
  currentStep: 1,
  organisation: { ...defaultOrganisation },
  facilities: [],
  period: { ...defaultPeriod },
  scope1Data: [],
  scope2Data: [],
  scope3Data: [],
  productionTonnes: null,
  annualTurnoverLakhInr: null,
  calculationResult: null,
  isCalculating: false,
  errors: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function scopeKey(scope: Scope): 'scope1Data' | 'scope2Data' | 'scope3Data' {
  if (scope === 1) return 'scope1Data';
  if (scope === 2) return 'scope2Data';
  return 'scope3Data';
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState & WizardActions>()((set) => ({
  ...initialState,

  // Navigation
  setStep: (step) => set({ currentStep: Math.max(1, Math.min(7, step)) }),
  nextStep: () => set((s) => ({ currentStep: Math.min(7, s.currentStep + 1) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(1, s.currentStep - 1) })),

  // Organisation
  updateOrganisation: (data) =>
    set((s) => ({ organisation: { ...s.organisation, ...data } })),

  // Facilities
  addFacility: (facility) =>
    set((s) => ({
      facilities: [...s.facilities, { ...facility, id: crypto.randomUUID() }],
    })),

  updateFacility: (id, data) =>
    set((s) => ({
      facilities: s.facilities.map((f) =>
        f.id === id ? { ...f, ...data } : f,
      ),
    })),

  removeFacility: (id) =>
    set((s) => ({
      facilities: s.facilities.filter((f) => f.id !== id),
    })),

  // Period
  updatePeriod: (data) =>
    set((s) => ({ period: { ...s.period, ...data } })),

  // Activity data
  addActivity: (scope, entry) =>
    set((s) => ({
      [scopeKey(scope)]: [
        ...s[scopeKey(scope)],
        { ...entry, id: crypto.randomUUID() },
      ],
    })),

  updateActivity: (scope, id, data) =>
    set((s) => ({
      [scopeKey(scope)]: s[scopeKey(scope)].map((e) =>
        e.id === id ? { ...e, ...data } : e,
      ),
    })),

  removeActivity: (scope, id) =>
    set((s) => ({
      [scopeKey(scope)]: s[scopeKey(scope)].filter((e) => e.id !== id),
    })),

  // Calculation context
  setProductionTonnes: (value) => set({ productionTonnes: value }),
  setAnnualTurnover: (value) => set({ annualTurnoverLakhInr: value }),

  // Results
  setCalculationResult: (result) => set({ calculationResult: result }),
  setIsCalculating: (value) => set({ isCalculating: value }),
  setErrors: (errors) => set({ errors }),

  // Reset
  reset: () => set({ ...initialState, organisation: { ...defaultOrganisation }, period: { ...defaultPeriod } }),
}));

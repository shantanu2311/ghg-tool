// ── End-Use Energy Splits & Technology Mapping ──────────────────────────────
// Defines how energy consumption is distributed across end-uses within each
// sub-sector, and maps each technology to the end-use it targets.

// ── Types ───────────────────────────────────────────────────────────────────

export interface EndUseSplit {
  endUse: string;
  share: number;
  label: string;
}

/** Nested map: [sector][subSector][fuelType] → EndUseSplit[] */
export type EndUseSplitMap = Record<string, Record<string, Record<string, EndUseSplit[]>>>;

export type TechPhase = 'efficiency' | 'source_switching';

// ── END_USE_SPLITS ──────────────────────────────────────────────────────────

export const END_USE_SPLITS: EndUseSplitMap = {
  iron_steel: {
    induction_furnace: {
      GRID_ELECTRICITY: [
        { endUse: 'furnace_melting', share: 0.80, label: 'Induction furnace (melting)' },
        { endUse: 'motors_pumps',    share: 0.08, label: 'Motors, pumps & fans' },
        { endUse: 'dust_extraction',  share: 0.04, label: 'Dust extraction' },
        { endUse: 'compressed_air',   share: 0.03, label: 'Compressed air' },
        { endUse: 'lighting',         share: 0.02, label: 'Lighting' },
        { endUse: 'other',            share: 0.03, label: 'Other auxiliaries' },
      ],
    },
    eaf_mini_mill: {
      GRID_ELECTRICITY: [
        { endUse: 'eaf_melting',        share: 0.65, label: 'EAF (melting)' },
        { endUse: 'ladle_furnace',      share: 0.10, label: 'Ladle furnace (refining)' },
        { endUse: 'continuous_casting', share: 0.07, label: 'Continuous casting' },
        { endUse: 'fume_extraction',    share: 0.06, label: 'Fume extraction & gas cleaning' },
        { endUse: 'motors_pumps',       share: 0.04, label: 'Cooling water pumps' },
        { endUse: 'compressed_air',     share: 0.03, label: 'Compressed air' },
        { endUse: 'cranes_handling',    share: 0.03, label: 'Cranes & material handling' },
        { endUse: 'lighting',           share: 0.02, label: 'Lighting' },
      ],
    },
    re_rolling: {
      GRID_ELECTRICITY: [
        { endUse: 'rolling_motors',       share: 0.65, label: 'Rolling mill motors (main drives)' },
        { endUse: 'furnace_auxiliaries',  share: 0.12, label: 'Furnace auxiliaries (blowers, pushers)' },
        { endUse: 'motors_pumps',         share: 0.08, label: 'Cooling water pumps' },
        { endUse: 'shears_auxiliary',     share: 0.05, label: 'Shears & auxiliary motors' },
        { endUse: 'compressed_air',       share: 0.04, label: 'Compressed air' },
        { endUse: 'cranes_handling',      share: 0.03, label: 'Roll turning, cranes & other' },
        { endUse: 'lighting',             share: 0.03, label: 'Lighting' },
      ],
    },
    forging: {
      GRID_ELECTRICITY: [
        { endUse: 'hammers_presses', share: 0.45, label: 'Hammers & presses (main drives)' },
        { endUse: 'compressed_air',  share: 0.20, label: 'Compressed air (pneumatic hammers)' },
        { endUse: 'motors_pumps',    share: 0.10, label: 'Cooling water & hydraulics' },
        { endUse: 'cranes_handling', share: 0.07, label: 'Cranes & material handling' },
        { endUse: 'lighting',        share: 0.04, label: 'Lighting' },
        { endUse: 'other',           share: 0.14, label: 'Other auxiliaries' },
      ],
    },
    casting_foundry: {
      GRID_ELECTRICITY: [
        { endUse: 'furnace_melting',   share: 0.83, label: 'Melting (induction furnace)' },
        { endUse: 'dust_extraction',   share: 0.05, label: 'Environmental control & dust extraction' },
        { endUse: 'moulding',          share: 0.03, label: 'Moulding & core making' },
        { endUse: 'compressed_air',    share: 0.03, label: 'Utilities & compressed air' },
        { endUse: 'fettling',          share: 0.02, label: 'Fettling & finishing' },
        { endUse: 'sand_preparation',  share: 0.02, label: 'Sand preparation' },
        { endUse: 'lighting',          share: 0.02, label: 'Lighting' },
      ],
    },
  },
};

// ── TECH_END_USE ────────────────────────────────────────────────────────────
// Maps each technology to the end-use it targets.
// 'all'            = cross-cutting (applies to full baseline)
// 'all_electricity' = source switching for all electricity
// 'all_fuel'       = fuel switching for all thermal fuel

export const TECH_END_USE: Record<string, string> = {
  T001: 'motors_pumps',        // Variable Frequency Drives (VFDs)
  T002: 'motors_pumps',        // IE3/IE4 Premium Efficiency Motors
  T003: 'all',                 // Energy Efficient Boilers (thermal, cross-cutting)
  T004: 'all',                 // Waste Heat Recovery Systems (cross-cutting)
  T005: 'compressed_air',      // Compressed Air System Optimization
  T006: 'lighting',            // LED Lighting Retrofit
  T007: 'all',                 // Insulation Upgrades (thermal, cross-cutting)
  T008: 'all',                 // ISO 50001 EMS — operational/behavioral only (3-5%); hardware savings excluded to avoid overlap with T001-T006
  T009: 'furnace_melting',     // Divided Blast Cupola (foundry-specific)
  T010: 'all',                 // Zig-Zag Kiln Technology (brick kiln specific)
  T011: 'all',                 // Common Boiler / Cogeneration (cross-cutting thermal)
  T012: 'furnace_melting',     // EE Induction Furnace (IGBT-based)
  T013: 'all',                 // Heat Recovery from Dye Liquor (textile-specific)
  T014: 'all',                 // Automated Sand Reclamation (foundry-specific)
  T015: 'all_electricity',     // Rooftop Solar PV (CAPEX)
  T016: 'all_electricity',     // Rooftop Solar PV (OPEX/RESCO)
  T017: 'all_electricity',     // Green Open Access (off-site RE)
  T018: 'all_electricity',     // Battery Storage (BESS) + Solar
  T019: 'all_fuel',            // Coal to Natural Gas (PNG) Switch
  T020: 'all_fuel',            // Biomass Briquettes (replacing coal)
  T021: 'all_fuel',            // Compressed Biogas (CBG)
  T022: 'all_fuel',            // Solar Thermal for Process Heat
  T023: 'all_fuel',            // Electrification of Thermal Processes
};

// ── TECH_PHASE ──────────────────────────────────────────────────────────────
// Phase 1: reduce demand first, Phase 2: switch source on the residual

export const TECH_PHASE: Record<string, TechPhase> = {
  T001: 'efficiency',
  T002: 'efficiency',
  T003: 'efficiency',
  T004: 'efficiency',
  T005: 'efficiency',
  T006: 'efficiency',
  T007: 'efficiency',
  T008: 'efficiency',
  T009: 'efficiency',
  T010: 'efficiency',
  T011: 'efficiency',
  T012: 'efficiency',
  T013: 'efficiency',
  T014: 'efficiency',
  T015: 'source_switching',
  T016: 'source_switching',
  T017: 'source_switching',
  T018: 'source_switching',
  T019: 'source_switching',
  T020: 'source_switching',
  T021: 'source_switching',
  T022: 'source_switching',
  T023: 'source_switching',
};

// ── getEndUseShare() ────────────────────────────────────────────────────────

/**
 * Returns the fraction (0-1) of energy that a technology targets within the
 * given sector/sub-sector/fuel combination.
 *
 * - Cross-cutting techs ('all', 'all_electricity', 'all_fuel') return 1.0
 * - End-use-specific techs return the matching share from END_USE_SPLITS
 * - Falls back to 1.0 if no split data is available
 */
export function getEndUseShare(
  techId: string,
  sector: string,
  subSector: string,
  fuelType: string,
): number {
  const endUse = TECH_END_USE[techId];
  if (!endUse) return 1.0;

  // Cross-cutting and source switching techs apply to full baseline
  if (endUse === 'all' || endUse === 'all_electricity' || endUse === 'all_fuel') {
    return 1.0;
  }

  // Look up splits for this sector/sub-sector/fuel
  const splits = END_USE_SPLITS[sector]?.[subSector]?.[fuelType];
  if (!splits) return 1.0;

  // Exact match
  const exact = splits.find((s) => s.endUse === endUse);
  if (exact) return exact.share;

  // Prefix match: e.g. 'furnace_melting' matches 'furnace_*' entries or
  // a tech targeting 'motors_pumps' that exists under a slightly different key
  const prefix = endUse.split('_')[0];
  const prefixMatch = splits.find((s) => s.endUse.startsWith(prefix));
  if (prefixMatch) return prefixMatch.share;

  // No match — tech doesn't target a known end-use in this sub-sector
  return 1.0;
}

// ── getEndUseLabel() ───────────────────────────────────────────────────────

/**
 * Returns a human-readable label for what a technology targets.
 * E.g., "Lighting (2% of electricity)" or "All electricity (source switching)"
 */
export function getEndUseLabel(
  techId: string,
  sector: string,
  subSector: string,
  fuelType: string,
): string {
  const endUse = TECH_END_USE[techId];
  if (!endUse) return 'Unknown';

  if (endUse === 'all') return 'Cross-cutting (all operations)';
  if (endUse === 'all_electricity') return 'All electricity (source switching)';
  if (endUse === 'all_fuel') return 'All fuel (fuel switching)';

  const splits = END_USE_SPLITS[sector]?.[subSector]?.[fuelType];
  if (!splits) return endUse.replace(/_/g, ' ');

  const match = splits.find((s) => s.endUse === endUse);
  if (match) {
    const pct = Math.round(match.share * 100);
    return `${match.label} (${pct}% of electricity)`;
  }

  // Prefix fallback
  const prefix = endUse.split('_')[0];
  const prefixMatch = splits.find((s) => s.endUse.startsWith(prefix));
  if (prefixMatch) {
    const pct = Math.round(prefixMatch.share * 100);
    return `${prefixMatch.label} (${pct}% of electricity)`;
  }

  return endUse.replace(/_/g, ' ');
}

// ── Source Citations ────────────────────────────────────────────────────────

export const END_USE_SPLIT_SOURCES = {
  induction_furnace: 'IspatGuru; SAMEEEKSHA cluster studies; BEE energy audit norms',
  eaf_mini_mill: 'AIST/Cappel 2021; SAMEEEKSHA EAF Compendium; UNIDO Benchmarking 2014',
  re_rolling: 'IspatGuru; SAMEEEKSHA Mandi Gobindgarh cluster profile',
  forging: 'SAMEEEKSHA Pune Forging cluster; UNIDO Technology Compendium',
  casting_foundry: 'BEE Best Operating Practices Guide, Belgaum Foundry; UNIDO Howrah/Belgaum/Indore compendiums',
} as const;

export const END_USE_SPLIT_DISCLAIMER =
  'End-use energy splits are baseline assumptions for a standard facility of this type, sourced from BEE energy audit guidelines, SAMEEEKSHA cluster studies, and UNIDO technology compendiums. Your actual splits may vary — a detailed energy audit will provide facility-specific data.';

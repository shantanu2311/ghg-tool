// ── Lever Groups ────────────────────────────────────────────────────────────
// Technologies that address the SAME emission source are grouped into levers.
// Within a lever group, options are mutually exclusive — only ONE can be active.
// Technologies NOT in any group are independent (can all be active simultaneously).

export interface LeverGroup {
  /** Unique lever key */
  lever: string;
  /** Human-readable name */
  label: string;
  /** Short description of what this lever addresses */
  description: string;
  /** Tech IDs in this group (mutually exclusive) */
  techIds: string[];
}

/**
 * Lever groups — mutually exclusive technology options.
 *
 * Renewable Electricity: All address Scope 2 grid electricity via RE procurement.
 *   A factory picks ONE RE strategy (rooftop solar OR open access OR BESS+solar).
 *
 * Fuel Switching: All replace coal/fossil fuel in furnaces/boilers.
 *   A factory switches to ONE alternative fuel (PNG OR biomass OR biogas).
 *
 * Process Heat Decarbonisation: Both address thermal process energy.
 *   A factory picks ONE approach (solar thermal OR electrification).
 */
export const LEVER_GROUPS: LeverGroup[] = [
  {
    lever: 'renewable_electricity',
    label: 'Renewable Electricity',
    description: 'Replace grid electricity with renewable energy (Scope 2)',
    techIds: ['T015', 'T016', 'T017', 'T018'],
  },
  {
    lever: 'fuel_switching',
    label: 'Fuel Switching',
    description: 'Replace coal/fossil fuels with cleaner alternatives (Scope 1)',
    techIds: ['T019', 'T020', 'T021'],
  },
  {
    lever: 'process_heat',
    label: 'Process Heat Decarbonisation',
    description: 'Decarbonise thermal energy for heating/reheating (Scope 1)',
    techIds: ['T022', 'T023'],
  },
];

/** Map from techId → lever key (null if independent) */
export const TECH_TO_LEVER: Record<string, string> = {};
for (const group of LEVER_GROUPS) {
  for (const id of group.techIds) {
    TECH_TO_LEVER[id] = group.lever;
  }
}

/** Get the lever group for a techId (undefined if independent) */
export function getLeverGroup(techId: string): LeverGroup | undefined {
  const lever = TECH_TO_LEVER[techId];
  if (!lever) return undefined;
  return LEVER_GROUPS.find((g) => g.lever === lever);
}

/** Get all techIds in the same lever group (empty if independent) */
export function getSiblingTechIds(techId: string): string[] {
  const group = getLeverGroup(techId);
  if (!group) return [];
  return group.techIds.filter((id) => id !== techId);
}

/**
 * Pick the "recommended" option within a lever group.
 * Criteria: highest pctOfTotal (impact), then lowest payback, then lowest CAPEX.
 */
export function pickRecommended(
  techs: { techId: string; pctOfTotal: number; paybackMinYears: number; capexMinLakhs: number | null }[],
): string | null {
  if (techs.length === 0) return null;
  const sorted = [...techs].sort((a, b) => {
    // Highest impact first
    if (b.pctOfTotal !== a.pctOfTotal) return b.pctOfTotal - a.pctOfTotal;
    // Then lowest payback
    if (a.paybackMinYears !== b.paybackMinYears) return a.paybackMinYears - b.paybackMinYears;
    // Then lowest CAPEX
    return (a.capexMinLakhs ?? 0) - (b.capexMinLakhs ?? 0);
  });
  return sorted[0].techId;
}

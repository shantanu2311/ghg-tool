'use client';

import { create } from 'zustand';
import { calculateCombinedImpact } from '@/lib/rec-engine/index';
import type { TechWithFunding, CombinedImpact, RecommendationResult } from '@/lib/rec-engine/types';
import { getSiblingTechIds, LEVER_GROUPS, TECH_TO_LEVER, pickRecommended } from '@/lib/rec-engine/lever-groups';

interface WhatIfState {
  periodId: string | null;
  recommendations: TechWithFunding[];
  notApplicable: string[];
  enabledTechIds: Set<string>;
  implementedPcts: Record<string, number>; // techId → 0-100 (% already implemented)
  combinedImpact: CombinedImpact | null;
  baselineScope1: number;
  baselineScope2: number;
  baselineScope3: number;
  baselineTotal: number;
  isLoading: boolean;
  error: string | null;
  selectedTechId: string | null;
  setupComplete: boolean; // Whether user has done the applicability setup
}

interface WhatIfActions {
  loadRecommendations: (periodId: string) => Promise<void>;
  toggleTechnology: (techId: string) => void;
  setImplementedPct: (techId: string, pct: number) => void;
  enableAll: () => void;
  disableAll: () => void;
  selectTech: (techId: string | null) => void;
  completeSetup: (applicableTechIds: Set<string>, implPcts: Record<string, number>) => void;
  reset: () => void;
}

const initialState: WhatIfState = {
  periodId: null,
  recommendations: [],
  notApplicable: [],
  enabledTechIds: new Set(),
  implementedPcts: {},
  combinedImpact: null,
  baselineScope1: 0,
  baselineScope2: 0,
  baselineScope3: 0,
  baselineTotal: 0,
  isLoading: false,
  error: null,
  selectedTechId: null,
  setupComplete: false,
};

function recalculate(
  recommendations: TechWithFunding[],
  enabledTechIds: Set<string>,
  baselineTotal: number,
  baselineScope1: number,
  baselineScope2: number,
  baselineScope3: number,
  implementedPcts?: Record<string, number>,
): CombinedImpact {
  const enabled = recommendations.filter((r) => enabledTechIds.has(r.techId));
  return calculateCombinedImpact(enabled, baselineTotal, baselineScope1, baselineScope2, baselineScope3, implementedPcts);
}

export const useWhatIfStore = create<WhatIfState & WhatIfActions>()((set, get) => ({
  ...initialState,

  loadRecommendations: async (periodId: string) => {
    set({ isLoading: true, error: null, periodId });

    try {
      const res = await fetch(`/api/recommendations/${periodId}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load recommendations');
      }

      const result: RecommendationResult = await res.json();

      const baseline = result.combinedImpact.baselineTotalTonnes;
      const scope1 = result.combinedImpact.baselineScope1Tonnes;
      const scope2 = result.combinedImpact.baselineScope2Tonnes;
      const scope3 = result.combinedImpact.baselineScope3Tonnes;

      // Don't auto-enable — wait for user to complete applicability setup
      const emptyImpact = calculateCombinedImpact([], baseline, scope1, scope2, scope3);

      set({
        recommendations: result.recommendations,
        notApplicable: result.notApplicable,
        combinedImpact: emptyImpact,
        baselineTotal: baseline,
        baselineScope1: scope1,
        baselineScope2: scope2,
        baselineScope3: scope3,
        enabledTechIds: new Set(),
        setupComplete: false,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },

  toggleTechnology: (techId: string) => {
    const { enabledTechIds, implementedPcts, recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const next = new Set(enabledTechIds);
    if (next.has(techId)) {
      next.delete(techId);
    } else {
      next.add(techId);
      // Mutual exclusion: disable sibling techs in the same lever group
      for (const siblingId of getSiblingTechIds(techId)) {
        next.delete(siblingId);
      }
    }

    const impact = recalculate(recommendations, next, baselineTotal, baselineScope1, baselineScope2, baselineScope3, implementedPcts);
    set({ enabledTechIds: next, combinedImpact: impact });
  },

  setImplementedPct: (techId: string, pct: number) => {
    const { implementedPcts, enabledTechIds, recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const nextPcts = { ...implementedPcts };
    const nextEnabled = new Set(enabledTechIds);

    // Get all techs in the same lever group — they share the same emission source
    const siblings = getSiblingTechIds(techId);
    const allGroupTechIds = siblings.length > 0 ? [techId, ...siblings] : [techId];

    if (pct <= 0) {
      // Remove implementation from entire lever group
      for (const id of allGroupTechIds) {
        delete nextPcts[id];
      }
    } else {
      // Apply implementation % to ALL techs in the lever group
      // They all address the same emission source, so if one is X% implemented,
      // the remaining potential for any alternative is only (100-X)%
      for (const id of allGroupTechIds) {
        nextPcts[id] = pct;
      }
      if (pct >= 100) {
        // Fully implemented — auto-disable (no remaining potential)
        for (const id of allGroupTechIds) {
          nextEnabled.delete(id);
        }
      } else {
        // Partial implementation — ensure the tech stays enabled so the
        // remaining reduction potential appears in the waterfall
        if (!nextEnabled.has(techId)) {
          nextEnabled.add(techId);
        }
      }
    }

    const impact = recalculate(recommendations, nextEnabled, baselineTotal, baselineScope1, baselineScope2, baselineScope3, nextPcts);
    set({ implementedPcts: nextPcts, enabledTechIds: nextEnabled, combinedImpact: impact });
  },

  enableAll: () => {
    const { recommendations, implementedPcts, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const all = new Set<string>();

    // For lever groups, only enable the recommended option
    for (const group of LEVER_GROUPS) {
      const groupTechs = recommendations.filter((r) => group.techIds.includes(r.techId));
      if (groupTechs.length > 0) {
        const best = pickRecommended(groupTechs);
        if (best) all.add(best);
      }
    }

    // Add all independent techs
    for (const r of recommendations) {
      if (!TECH_TO_LEVER[r.techId]) all.add(r.techId);
    }

    // Exclude techs that are 100% already implemented
    for (const [techId, pct] of Object.entries(implementedPcts)) {
      if (pct >= 100) all.delete(techId);
    }

    const impact = recalculate(recommendations, all, baselineTotal, baselineScope1, baselineScope2, baselineScope3, implementedPcts);
    set({ enabledTechIds: all, combinedImpact: impact });
  },

  disableAll: () => {
    const { recommendations, implementedPcts, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const impact = recalculate(recommendations, new Set(), baselineTotal, baselineScope1, baselineScope2, baselineScope3, implementedPcts);
    set({ enabledTechIds: new Set(), combinedImpact: impact });
  },

  completeSetup: (applicableTechIds: Set<string>, implPcts: Record<string, number>) => {
    const { recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();

    // Enable applicable techs, respecting lever group exclusivity
    const enabled = new Set<string>();
    const seenLevers = new Set<string>();
    // Sort by payback to pick best from lever groups
    const sorted = recommendations
      .filter((r) => applicableTechIds.has(r.techId))
      .sort((a, b) => a.paybackMinYears - b.paybackMinYears);

    for (const tech of sorted) {
      // Skip 100% implemented techs BEFORE claiming the lever group,
      // so alternatives in the same group can still be enabled
      if ((implPcts[tech.techId] ?? 0) >= 100) continue;
      const lever = TECH_TO_LEVER[tech.techId];
      if (lever) {
        if (seenLevers.has(lever)) continue;
        seenLevers.add(lever);
      }
      enabled.add(tech.techId);
    }

    const impact = recalculate(recommendations, enabled, baselineTotal, baselineScope1, baselineScope2, baselineScope3, implPcts);
    set({
      enabledTechIds: enabled,
      implementedPcts: implPcts,
      combinedImpact: impact,
      setupComplete: true,
    });
  },

  selectTech: (techId: string | null) => set({ selectedTechId: techId }),

  reset: () => set(initialState),
}));

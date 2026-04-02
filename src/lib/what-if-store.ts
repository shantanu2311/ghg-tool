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
}

interface WhatIfActions {
  loadRecommendations: (periodId: string) => Promise<void>;
  toggleTechnology: (techId: string) => void;
  setImplementedPct: (techId: string, pct: number) => void;
  enableAll: () => void;
  disableAll: () => void;
  selectTech: (techId: string | null) => void;
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

      // Auto-enable: recommended option per lever group + all independent techs
      const autoEnabled = new Set<string>();
      for (const group of LEVER_GROUPS) {
        const groupTechs = result.recommendations.filter((r: TechWithFunding) => group.techIds.includes(r.techId));
        if (groupTechs.length > 0) {
          const best = pickRecommended(groupTechs);
          if (best) autoEnabled.add(best);
        }
      }
      for (const r of result.recommendations) {
        if (!TECH_TO_LEVER[r.techId]) autoEnabled.add(r.techId);
      }

      // Recalculate with the auto-enabled set (respects lever groups)
      const autoImpact = calculateCombinedImpact(
        result.recommendations.filter((r: TechWithFunding) => autoEnabled.has(r.techId)),
        baseline, scope1, scope2, scope3,
      );

      set({
        recommendations: result.recommendations,
        notApplicable: result.notApplicable,
        combinedImpact: autoImpact,
        baselineTotal: baseline,
        baselineScope1: scope1,
        baselineScope2: scope2,
        baselineScope3: scope3,
        enabledTechIds: autoEnabled,
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
      // If 100% implemented, auto-disable all group techs (no remaining potential)
      if (pct >= 100) {
        for (const id of allGroupTechIds) {
          nextEnabled.delete(id);
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

  selectTech: (techId: string | null) => set({ selectedTechId: techId }),

  reset: () => set(initialState),
}));

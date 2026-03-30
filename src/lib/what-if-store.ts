'use client';

import { create } from 'zustand';
import { calculateCombinedImpact } from '@/lib/rec-engine/index';
import type { TechWithFunding, CombinedImpact, RecommendationResult } from '@/lib/rec-engine/types';

interface WhatIfState {
  periodId: string | null;
  recommendations: TechWithFunding[];
  notApplicable: string[];
  enabledTechIds: Set<string>;
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
): CombinedImpact {
  const enabled = recommendations.filter((r) => enabledTechIds.has(r.techId));
  return calculateCombinedImpact(enabled, baselineTotal, baselineScope1, baselineScope2, baselineScope3);
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

      set({
        recommendations: result.recommendations,
        notApplicable: result.notApplicable,
        combinedImpact: result.combinedImpact,
        baselineTotal: baseline,
        baselineScope1: scope1,
        baselineScope2: scope2,
        baselineScope3: scope3,
        enabledTechIds: new Set(),
        isLoading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },

  toggleTechnology: (techId: string) => {
    const { enabledTechIds, recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const next = new Set(enabledTechIds);
    if (next.has(techId)) next.delete(techId);
    else next.add(techId);

    const impact = recalculate(recommendations, next, baselineTotal, baselineScope1, baselineScope2, baselineScope3);
    set({ enabledTechIds: next, combinedImpact: impact });
  },

  enableAll: () => {
    const { recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const all = new Set(recommendations.map((r) => r.techId));
    const impact = recalculate(recommendations, all, baselineTotal, baselineScope1, baselineScope2, baselineScope3);
    set({ enabledTechIds: all, combinedImpact: impact });
  },

  disableAll: () => {
    const { recommendations, baselineTotal, baselineScope1, baselineScope2, baselineScope3 } = get();
    const impact = recalculate(recommendations, new Set(), baselineTotal, baselineScope1, baselineScope2, baselineScope3);
    set({ enabledTechIds: new Set(), combinedImpact: impact });
  },

  selectTech: (techId: string | null) => set({ selectedTechId: techId }),

  reset: () => set(initialState),
}));

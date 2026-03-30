'use client';

import { useState, useEffect, useMemo } from 'react';

interface FuelProperty {
  id: string;
  code: string;
  name: string;
  category: string;
  baseUnit: string;
}

interface EmissionFactor {
  id: string;
  fuelOrActivity: string;
  scope: number;
  scopeCategory: string;
  efUnit: string;
}

export interface FuelOption {
  value: string;  // fuelOrActivity code
  label: string;  // human-readable name
  unit: string;   // default unit for input
}

/**
 * Fetch fuel properties + emission factors from API,
 * derive dropdown options per scope and category.
 * Returns a map: { [category]: FuelOption[] }
 */
export function useFuelOptions(scope: number) {
  const [fuels, setFuels] = useState<FuelProperty[]>([]);
  const [efs, setEfs] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fuelRes, efRes] = await Promise.all([
          fetch('/api/fuel-properties'),
          fetch(`/api/emission-factors?scope=${scope}`),
        ]);
        if (cancelled) return;
        const fuelData = await fuelRes.json();
        const efData = await efRes.json();
        if (!cancelled) {
          setFuels(Array.isArray(fuelData) ? fuelData : []);
          setEfs(Array.isArray(efData) ? efData : []);
        }
      } catch {
        // Silently fail — components show empty dropdowns if API is down
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [scope]);

  const optionsByCategory = useMemo(() => {
    const fuelMap = new Map(fuels.map((f) => [f.code, f]));
    const result: Record<string, FuelOption[]> = {};

    for (const ef of efs) {
      const cat = ef.scopeCategory || 'other';
      if (!result[cat]) result[cat] = [];

      // Avoid duplicates within category
      if (result[cat].some((o) => o.value === ef.fuelOrActivity)) continue;

      const fuel = fuelMap.get(ef.fuelOrActivity);
      const label = fuel?.name || ef.fuelOrActivity.replace(/_/g, ' ');

      // Derive user-facing unit: prefer fuel baseUnit, fall back to EF unit
      let unit = fuel?.baseUnit || ef.efUnit;
      // Convert internal units to user-friendly labels
      if (unit === 'kL') unit = 'litres';
      if (unit === 'tonne') unit = 'tonnes';
      if (unit === '1000m3') unit = 'SCM';
      if (unit === 'tonne_km') unit = 'tonne-km';

      result[cat].push({ value: ef.fuelOrActivity, label, unit });
    }

    // Sort options within each category
    for (const cat of Object.keys(result)) {
      result[cat].sort((a, b) => a.label.localeCompare(b.label));
    }

    return result;
  }, [fuels, efs]);

  return { optionsByCategory, loading };
}

'use client';

import { useState, useEffect, useCallback } from 'react';

interface CustomSource {
  id: string;
  orgId: string;
  name: string;
  code: string;
  scope: number;
  sourceCategory: string;
  description: string | null;
  co2EfKgPerUnit: number;
  ch4EfKgPerUnit: number | null;
  n2oEfKgPerUnit: number | null;
  efSource: string;
  efSourceUrl: string | null;
  baseUnit: string;
  density: number | null;
  ncvTjPerGg: number | null;
  defaultPriceInr: number | null;
  verified: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
}

export function useCustomSources(orgId?: string | undefined) {
  const [sources, setSources] = useState<CustomSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = orgId
        ? `/api/custom-sources?orgId=${encodeURIComponent(orgId)}`
        : '/api/custom-sources';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch custom sources');
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custom sources');
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  return { sources, loading, error, refetch: fetchSources };
}

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface JargonEntry {
  id: string;
  term: string;
  fullForm: string;
  explanation: string;
  whoDoesIt: string | null;
  typicalCostInr: string | null;
  isReimbursed: string | null;
  relatedTerms: string[] | null;
}

interface JargonContextValue {
  jargonMap: Map<string, JargonEntry>;
  loading: boolean;
}

const JargonContext = createContext<JargonContextValue>({
  jargonMap: new Map(),
  loading: true,
});

export function useJargon() {
  return useContext(JargonContext);
}

export function JargonProvider({ children }: { children: ReactNode }) {
  const [jargonMap, setJargonMap] = useState<Map<string, JargonEntry>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jargon')
      .then((res) => res.json())
      .then((data: JargonEntry[]) => {
        const map = new Map<string, JargonEntry>();
        for (const entry of data) {
          map.set(entry.term, entry);
        }
        setJargonMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <JargonContext.Provider value={{ jargonMap, loading }}>
      {children}
    </JargonContext.Provider>
  );
}

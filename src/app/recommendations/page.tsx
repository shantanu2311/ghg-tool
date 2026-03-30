'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PeriodInfo {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  organisation: { name: string };
}

export default function RecommendationsIndexPage() {
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/periods')
      .then((r) => r.json())
      .then((data) => {
        const calculated = (data ?? []).filter((p: PeriodInfo) => p.status === 'calculated');
        setPeriods(calculated);
      })
      .catch(() => setPeriods([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Emission Reduction Recommendations</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Select a completed inventory period to explore reduction technologies.
        </p>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : periods.length === 0 ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">No calculated periods found.</p>
            <Link
              href="/wizard"
              className="mt-4 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Go to Wizard
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {periods.map((p) => (
              <Link
                key={p.id}
                href={`/recommendations/${p.id}`}
                className="block rounded-lg border border-zinc-200 p-3 hover:border-teal-300 hover:bg-teal-50 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900">{p.organisation.name}</p>
                <p className="text-xs text-zinc-500">
                  {p.startDate} to {p.endDate}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

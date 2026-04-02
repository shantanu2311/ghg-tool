'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight, ClipboardList, Inbox } from 'lucide-react';

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
    <div className="flex flex-col items-center justify-center py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            Emission Reduction Recommendations
          </CardTitle>
          <CardDescription>
            Select a completed inventory period to explore reduction technologies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : periods.length === 0 ? (
            <div className="flex flex-col items-center text-center py-6">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No calculated periods found.</p>
              <Link
                href="/wizard"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Go to Wizard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => (
                <Link
                  key={p.id}
                  href={`/recommendations/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium">{p.organisation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to {new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

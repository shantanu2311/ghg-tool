'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionStep, type ActionStepData } from './action-step';

interface SchemeInfo {
  schemeId: string;
  name: string;
  implementingAgency: string;
  supportType: string;
  status: string;
  applicationUrl: string | null;
}

interface ActionPlanProps {
  schemeId: string;
  className?: string;
}

export function ActionPlan({ schemeId, className }: ActionPlanProps) {
  const [scheme, setScheme] = useState<SchemeInfo | null>(null);
  const [steps, setSteps] = useState<ActionStepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/action-plans/${schemeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load action plan');
        return res.json();
      })
      .then((data) => {
        setScheme(data.scheme);
        setSteps(data.steps);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [schemeId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !scheme) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? 'Action plan not available for this scheme yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Step-by-Step Action Plan
              </CardTitle>
            </div>
            <CardDescription className="mt-1">
              {scheme.name} — {scheme.supportType}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              scheme.status === 'Active'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }
          >
            {scheme.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Agency: {scheme.implementingAgency}
        </p>
      </CardHeader>
      <CardContent>
        {steps.length > 0 ? (
          <div className="space-y-0">
            {steps.map((step, i) => (
              <ActionStep
                key={step.id}
                step={step}
                isLast={i === steps.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Detailed steps coming soon for this scheme.
          </p>
        )}

        {scheme.applicationUrl && (
          <div className="mt-4 pt-4 border-t border-border">
            <a href={scheme.applicationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="h-3 w-3" />
                Go to Official Portal
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

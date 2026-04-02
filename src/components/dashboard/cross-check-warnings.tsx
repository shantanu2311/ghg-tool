'use client';

import { cn } from '@/lib/utils';
import type { CrossCheckWarning } from '@/lib/calc-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, CircleCheck } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

interface CrossCheckWarningsProps {
  warnings: CrossCheckWarning[];
}

function severityIcon(severity: string) {
  switch (severity) {
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'info': return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    default: return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function severityStyles(severity: string) {
  switch (severity) {
    case 'error': return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'warning': return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'info': return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function severityBadgeColor(severity: string) {
  switch (severity) {
    case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'warning': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function CrossCheckWarnings({ warnings }: CrossCheckWarningsProps) {
  if (warnings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cross-Check Warnings <InfoTip text="Automated sanity checks comparing your data against expected ranges for your sub-sector. Helps identify data entry errors." /></CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6 gap-2">
          <CircleCheck className="h-4 w-4 text-emerald-500" />
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            No warnings - all cross-checks passed
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cross-Check Warnings <InfoTip text="Automated sanity checks comparing your data against expected ranges for your sub-sector. Helps identify data entry errors." /></CardTitle>
        <CardDescription className="text-[11px]">
          {warnings.length} issue{warnings.length !== 1 ? 's' : ''} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={`${w.category}-${i}`}
              className={cn('rounded-lg border p-3', severityStyles(w.severity))}
            >
              <div className="flex items-center gap-2">
                {severityIcon(w.severity)}
                <Badge className={cn('text-[10px] uppercase', severityBadgeColor(w.severity))}>
                  {w.severity}
                </Badge>
                <span className="text-xs font-medium">{w.category}</span>
              </div>
              <p className="mt-1 text-sm ml-6">{w.message}</p>
              {w.expectedRange && w.actualValue != null && (
                <p className="mt-1 text-[11px] opacity-75 ml-6">
                  Expected: {w.expectedRange.min}--{w.expectedRange.max} {w.expectedRange.unit} | Actual: {typeof w.actualValue === 'number' ? w.actualValue.toFixed(2) : w.actualValue}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

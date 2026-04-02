'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, Info } from 'lucide-react';
import { FieldHelpButton } from '@/components/ai/field-help-button';
import { InfoTip } from '@/components/ui/info-tip';

const PRESETS = [
  { label: 'FY 2023-24', start: '2023-04-01', end: '2024-03-31' },
  { label: 'FY 2024-25', start: '2024-04-01', end: '2025-03-31' },
  { label: 'CY 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Custom', start: '', end: '' },
] as const;

export default function StepPeriod() {
  const period = useWizardStore((s) => s.period);
  const update = useWizardStore((s) => s.updatePeriod);

  function getActivePreset(): string {
    const match = PRESETS.find(
      (p) => p.start && p.start === period.startDate && p.end === period.endDate,
    );
    return match ? match.label : 'Custom';
  }

  const activePreset = getActivePreset();

  function handlePreset(preset: (typeof PRESETS)[number]) {
    if (preset.label === 'Custom') return;
    update({ startDate: preset.start, endDate: preset.end });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">
            <Calendar className="inline h-4 w-4 mr-1.5 text-muted-foreground" />
            Reporting Period
          </CardTitle>
          <FieldHelpButton step="period" />
        </div>
        <CardDescription>
          Select the time period for this GHG inventory. Indian companies typically report on a
          financial year (April to March) basis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick-select buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
                activePreset === preset.label
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date pickers */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="period-start">
              Start Date <span className="text-destructive">*</span>
              <InfoTip text="First day of your reporting period. Indian FY starts April 1." />
            </Label>
            <Input
              id="period-start"
              type="date"
              value={period.startDate}
              onChange={(e) => update({ startDate: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="period-end">
              End Date <span className="text-destructive">*</span>
              <InfoTip text="Last day of your reporting period. Indian FY ends March 31." />
            </Label>
            <Input
              id="period-end"
              type="date"
              value={period.endDate}
              onChange={(e) => update({ endDate: e.target.value })}
            />
          </div>
        </div>

        {/* Base Year toggle */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <Switch
            checked={period.baseYearFlag}
            onCheckedChange={(checked) => update({ baseYearFlag: !!checked })}
          />
          <div>
            <Label className="cursor-pointer text-sm font-medium">
              Mark as Base Year
              <InfoTip text="The base year is your reference point for measuring emission reductions over time." />
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              The base year is used as the reference point for tracking emission reductions over time.
            </p>
          </div>
        </div>

        {/* Period summary */}
        {period.startDate && period.endDate && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary">
              <span className="font-medium">Selected period:</span>{' '}
              {new Date(period.startDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              to{' '}
              {new Date(period.endDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {period.baseYearFlag && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  Base Year
                </Badge>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

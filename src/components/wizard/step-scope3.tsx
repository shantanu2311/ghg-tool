'use client';

import { useState } from 'react';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SCOPE3_CATEGORIES } from '@/lib/calc-engine/constants';
import { useFuelOptions } from '@/lib/hooks/use-fuel-options';
import type { ActivityEntry } from '@/lib/store';
import type { FuelOption } from '@/lib/hooks/use-fuel-options';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Inbox, ChevronRight, Info } from 'lucide-react';

const DATA_QUALITY_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary', color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  { value: 'SECONDARY', label: 'Secondary', color: 'text-amber-600 border-amber-200 bg-amber-50' },
  { value: 'ESTIMATED', label: 'Estimated', color: 'text-red-600 border-red-200 bg-red-50' },
] as const;

// ── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  sourceOptions,
  onUpdate,
  onRemove,
  facilities,
}: {
  entry: ActivityEntry;
  sourceOptions: FuelOption[];
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  facilities: { id: string; name: string }[];
}) {
  const selectedSource = sourceOptions.find((f) => f.value === entry.fuelType);
  const defaultUnit = selectedSource?.unit ?? '';

  function handleSourceChange(fuelType: string) {
    const source = sourceOptions.find((f) => f.value === fuelType);
    onUpdate(entry.id, { fuelType, unit: source?.unit ?? '' });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Facility */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Facility</Label>
          <Select
            value={entry.facilityId }
            onValueChange={(val) => onUpdate(entry.id, { facilityId: val ?? '' })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select facility">
                {() => {
                  const f = facilities.find((fac) => fac.id === entry.facilityId);
                  return f?.name || 'Select facility';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {facilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name || 'Unnamed Facility'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Source Type</Label>
          <Select
            value={entry.fuelType }
            onValueChange={(val) => handleSourceChange(val ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type">
                {() => {
                  const f = sourceOptions.find((fo) => fo.value === entry.fuelType);
                  return f?.label || 'Select type';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sourceOptions.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input Mode Toggle */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Input Mode</Label>
          <Tabs
            value={entry.inputMode}
            onValueChange={(val) => {
              const updates: Partial<Omit<ActivityEntry, 'id'>> = { inputMode: val as 'quantity' | 'spend' };
              if (val === 'spend') updates.dataQualityFlag = 'ESTIMATED';
              onUpdate(entry.id, updates);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="quantity" className="flex-1 text-xs">Quantity</TabsTrigger>
              <TabsTrigger value="spend" className="flex-1 text-xs">Spend (INR)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Quantity or Spend */}
        {entry.inputMode === 'quantity' ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Quantity ({defaultUnit || 'unit'})
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={entry.quantity ?? ''}
              onChange={(e) =>
                onUpdate(entry.id, {
                  quantity: e.target.value ? Number(e.target.value) : null,
                  unit: defaultUnit,
                })
              }
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Spend (INR)</Label>
            <Input
              type="number"
              placeholder="0"
              value={entry.spendInr ?? ''}
              onChange={(e) =>
                onUpdate(entry.id, {
                  spendInr: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        )}

        {/* Data Quality */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data Quality</Label>
          <div className="flex gap-1.5">
            {DATA_QUALITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  onUpdate(entry.id, { dataQualityFlag: o.value as 'PRIMARY' | 'SECONDARY' | 'ESTIMATED' })
                }
                className={cn(
                  'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors',
                  entry.dataQualityFlag === o.value
                    ? o.color
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Description (optional)</Label>
          <Input
            placeholder="e.g. Supplier name, route details"
            value={entry.description}
            onChange={(e) => onUpdate(entry.id, { description: e.target.value })}
          />
        </div>
      </div>

      {/* Remove */}
      <div className="flex items-center justify-end pt-1 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(entry.id)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Remove
        </Button>
      </div>
    </div>
  );
}

// ── Collapsible Category Section ─────────────────────────────────────────────

function CategorySection({
  category,
  label,
  entries,
  sourceOptions,
  facilities,
  onAdd,
  onUpdate,
  onRemove,
  notApplicable,
  onToggleNA,
}: {
  category: string;
  label: string;
  entries: ActivityEntry[];
  sourceOptions: FuelOption[];
  facilities: { id: string; name: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  notApplicable: boolean;
  onToggleNA: () => void;
}) {
  const [expanded, setExpanded] = useState(entries.length > 0);

  return (
    <Card className={cn(notApplicable && 'opacity-60')}>
      {/* Header -- click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-90',
            )}
          />
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {notApplicable && ' -- marked as N/A'}
            </p>
          </div>
        </div>
        {entries.length > 0 && !notApplicable && (
          <Badge variant="secondary" className="text-[10px]">
            {entries.length}
          </Badge>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="border-t border-border space-y-4 pt-4">
          {/* Not Applicable toggle */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch
              size="sm"
              checked={notApplicable}
              onCheckedChange={(checked) => {
                onToggleNA();
              }}
            />
            Not Applicable -- this category does not apply to our operations
          </label>

          {!notApplicable && (
            <>
              {entries.length > 0 ? (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      sourceOptions={sourceOptions}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      facilities={facilities}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-6">
                  <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No entries yet</p>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" />
                Add Entry
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepScope3() {
  const facilities = useWizardStore((s) => s.facilities);
  const scope3Data = useWizardStore((s) => s.scope3Data);
  const addActivity = useWizardStore((s) => s.addActivity);
  const updateActivity = useWizardStore((s) => s.updateActivity);
  const removeActivity = useWizardStore((s) => s.removeActivity);
  const { optionsByCategory, loading } = useFuelOptions(3);

  const [naCategories, setNaCategories] = useState<Set<string>>(new Set());

  function handleAdd(category: string) {
    const defaultFacilityId = facilities.length > 0 ? facilities[0].id : '';
    addActivity(3, {
      facilityId: defaultFacilityId,
      sourceCategory: category,
      fuelType: '',
      description: '',
      inputMode: 'quantity',
      quantity: null,
      unit: '',
      spendInr: null,
      dataQualityFlag: 'SECONDARY',
      month: null,
    });
  }

  function handleUpdate(id: string, data: Partial<Omit<ActivityEntry, 'id'>>) {
    updateActivity(3, id, data);
  }

  function handleRemove(id: string) {
    removeActivity(3, id);
  }

  function toggleNA(category: string) {
    setNaCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Scope 3 -- Value Chain Emissions</CardTitle>
          <CardDescription>
            Indirect emissions from your value chain: purchased materials, transportation,
            waste, and business travel. Mark categories as &quot;Not Applicable&quot; if they
            don&apos;t apply to your operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-2.5">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Spend-based entries are automatically flagged as &quot;Estimated&quot; quality.
              Where possible, use quantity-based data for better accuracy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </CardContent>
        </Card>
      )}

      {/* Collapsible sections per category */}
      {SCOPE3_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.value}
          category={cat.value}
          label={cat.label}
          entries={scope3Data.filter((e) => e.sourceCategory === cat.value)}
          sourceOptions={optionsByCategory[cat.value] ?? []}
          facilities={facilities}
          onAdd={() => handleAdd(cat.value)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          notApplicable={naCategories.has(cat.value)}
          onToggleNA={() => toggleNA(cat.value)}
        />
      ))}
    </div>
  );
}

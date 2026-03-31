'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SCOPE2_CATEGORIES } from '@/lib/calc-engine/constants';
import { useFuelOptions } from '@/lib/hooks/use-fuel-options';
import type { ActivityEntry } from '@/lib/store';
import type { FuelOption } from '@/lib/hooks/use-fuel-options';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Inbox, AlertTriangle } from 'lucide-react';

const DATA_QUALITY_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary', color: 'text-emerald-600 border-emerald-200 bg-emerald-50' },
  { value: 'SECONDARY', label: 'Secondary', color: 'text-amber-600 border-amber-200 bg-amber-50' },
  { value: 'ESTIMATED', label: 'Estimated', color: 'text-red-600 border-red-200 bg-red-50' },
] as const;

// ── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  fuelOptions,
  onUpdate,
  onRemove,
  facilities,
}: {
  entry: ActivityEntry;
  fuelOptions: FuelOption[];
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  facilities: { id: string; name: string; gridRegion: string }[];
}) {
  const selectedFuel = fuelOptions.find((f) => f.value === entry.fuelType);
  const defaultUnit = selectedFuel?.unit ?? '';
  const selectedFacility = facilities.find((f) => f.id === entry.facilityId);

  function handleFuelChange(fuelType: string) {
    const fuel = fuelOptions.find((f) => f.value === fuelType);
    onUpdate(entry.id, { fuelType, unit: fuel?.unit ?? '' });
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
          {selectedFacility?.gridRegion && (
            <p className="text-[11px] text-muted-foreground/70">
              Grid region: {selectedFacility.gridRegion}
            </p>
          )}
        </div>

        {/* Source Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Energy Source</Label>
          <Select
            value={entry.fuelType }
            onValueChange={(val) => handleFuelChange(val ?? '')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select source">
                {() => {
                  const f = fuelOptions.find((fo) => fo.value === entry.fuelType);
                  return f?.label || 'Select source';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {fuelOptions.map((f) => (
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
            placeholder="e.g. Main meter, Solar panels"
            value={entry.description}
            onChange={(e) => onUpdate(entry.id, { description: e.target.value })}
          />
        </div>
      </div>

      {/* Monthly toggle + Remove */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border text-primary focus:ring-primary"
            checked={entry.month !== null}
            onChange={(e) =>
              onUpdate(entry.id, { month: e.target.checked ? 1 : null })
            }
          />
          Monthly breakdown
        </label>
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

      {entry.month !== null && (
        <div className="space-y-1 pt-1">
          <Label className="text-xs text-muted-foreground">Month (1-12)</Label>
          <Input
            type="number"
            min={1}
            max={12}
            className="w-24"
            value={entry.month ?? 1}
            onChange={(e) =>
              onUpdate(entry.id, { month: e.target.value ? Number(e.target.value) : 1 })
            }
          />
          <p className="text-[11px] text-muted-foreground/70">
            Add separate entries for each month if using monthly breakdown.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Category Section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  label,
  entries,
  fuelOptions,
  facilities,
  onAdd,
  onUpdate,
  onRemove,
}: {
  category: string;
  label: string;
  entries: ActivityEntry[];
  fuelOptions: FuelOption[];
  facilities: { id: string; name: string; gridRegion: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<Omit<ActivityEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {category === 'grid_electricity' && 'Electricity purchased from the grid and captive renewable generation'}
            {category === 'purchased_steam' && 'Steam or heat purchased from external suppliers'}
          </CardDescription>
        </div>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5 text-xs">
            <Plus className="h-3 w-3" />
            Add Entry
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                fuelOptions={fuelOptions}
                onUpdate={onUpdate}
                onRemove={onRemove}
                facilities={facilities}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No entries yet</p>
            <Button variant="ghost" size="sm" onClick={onAdd} className="mt-2 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add Entry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StepScope2() {
  const facilities = useWizardStore((s) => s.facilities);
  const scope2Data = useWizardStore((s) => s.scope2Data);
  const addActivity = useWizardStore((s) => s.addActivity);
  const updateActivity = useWizardStore((s) => s.updateActivity);
  const removeActivity = useWizardStore((s) => s.removeActivity);
  const { optionsByCategory, loading } = useFuelOptions(2);

  function handleAdd(category: string) {
    const defaultFacilityId = facilities.length > 0 ? facilities[0].id : '';
    addActivity(2, {
      facilityId: defaultFacilityId,
      sourceCategory: category,
      fuelType: '',
      description: '',
      inputMode: 'quantity',
      quantity: null,
      unit: '',
      spendInr: null,
      dataQualityFlag: 'PRIMARY',
      month: null,
    });
  }

  function handleUpdate(id: string, data: Partial<Omit<ActivityEntry, 'id'>>) {
    updateActivity(2, id, data);
  }

  function handleRemove(id: string) {
    removeActivity(2, id);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Scope 2 -- Purchased Energy</CardTitle>
          <CardDescription>
            Emissions from purchased electricity, steam, or heat consumed by your facilities.
            The grid emission factor is determined by your facility&apos;s state (CEA regional grid).
          </CardDescription>
        </CardHeader>
        {facilities.length === 0 && (
          <CardContent>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                No facilities added. Please go back to Step 2 and add at least one facility.
              </p>
            </div>
          </CardContent>
        )}
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

      {/* One section per category */}
      {SCOPE2_CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.value}
          category={cat.value}
          label={cat.label}
          entries={scope2Data.filter((e) => e.sourceCategory === cat.value)}
          fuelOptions={optionsByCategory[cat.value] ?? []}
          facilities={facilities}
          onAdd={() => handleAdd(cat.value)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
